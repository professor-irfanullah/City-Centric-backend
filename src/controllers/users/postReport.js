const { pool } = require("../../config/db");
const { errorGenerator } = require("../../utils/errorGenarator");
const { uploadOnCloudinary, deleteFromCloudinary } = require('../../utils/cloudinary');

const isValidCoordinates = (coordinateString) => {
    const parts = coordinateString.split(/[,\s]+/);

    if (parts.length !== 2) {
        return false;
    }

    const latitude = parseFloat(parts[0]);
    const longitude = parseFloat(parts[1]);

    if (isNaN(latitude) || isNaN(longitude)) {
        return false;
    }

    const isLatValid = latitude >= -90 && latitude <= 90;
    const isLngValid = longitude >= -180 && longitude <= 180;

    return isLatValid && isLngValid;
};

const postReport = async (req, res, next) => {
    const user = req.user;
    let client;
    const uploadedImages = []; // Track uploaded images for cleanup

    const info = req.body;
    if (!info) return next(errorGenerator('Please provide valid report', 400));
    const { data } = info
    const allowdDisasters = ['Flood', 'Earthquake', 'Land_slide', 'Fire']
    const parsedData = JSON.parse(data)
    // Destructure with default values
    const {
        disaster_type, location, are_properties_impacted, are_humans_impacted,
        total_residents_count = 0, deaths_count = 0, injured_count = 0,
        pregnant_women_count = 0, disabled_persons_count = 0,
        school_going_children_count = 0, married_couples_count = 0,
        are_animals_impacted, big_animals_death_count = 0,
        big_animals_injured_count = 0, small_animals_death_count = 0,
        small_animals_injured_count = 0, properties = []
    } = parsedData;

    // Validate numeric fields
    const numericFields = {
        total_residents_count, deaths_count, injured_count,
        pregnant_women_count, disabled_persons_count,
        school_going_children_count, married_couples_count, big_animals_death_count,
        big_animals_injured_count, small_animals_death_count, small_animals_injured_count
    };

    for (const [key, value] of Object.entries(numericFields)) {
        if (isNaN(value)) {
            return next(errorGenerator(`${key} must be a number`, 400));
        }
    }
    if (!disaster_type || !location) return next(errorGenerator('Disaster type & location are required', 400));

    if (!allowdDisasters.includes(disaster_type)) return next(errorGenerator('Invalid Disaster type', 400));

    if (!isValidCoordinates(location)) return next(errorGenerator('Invalid Location', 400));

    if (!are_animals_impacted && !are_properties_impacted && !are_humans_impacted) return next(errorGenerator('Report Must contain at least one catagory', 400));

    if (!are_animals_impacted && (big_animals_death_count + small_animals_death_count + small_animals_injured_count + big_animals_injured_count) > 0) return next(errorGenerator('If animals are not impacted total animal count should be zero'));

    if (are_animals_impacted === true && (small_animals_death_count < 0 || big_animals_death_count < 0 || small_animals_injured_count < 0 || big_animals_injured_count < 0)) return next(errorGenerator('Animals impact cannot be negative'));
    // properties section
    if (are_properties_impacted === true && !properties) return next(errorGenerator('Missing properties details in the form', 400));
    const isArray = Array.isArray(properties)

    if (isArray === false && are_properties_impacted === true) return next(errorGenerator('Expected type is array for the key properties ', 400));

    if (properties.length <= 0 && are_properties_impacted === true) return next(errorGenerator('If properties are damaged atleast one property is required', 400));
    const validLevels = ['minor', 'major', 'fully_destroyed']
    const validPropertyTypes = ['Home', 'Shop', 'Warehouse', 'Farm/Field', 'Livestock Shed', 'School/Mosque', 'Road/Bridge']
    const isValidProperties = properties.every(property => {
        if (!validPropertyTypes.includes(property.property_type) || !validLevels.includes(property.damage_level)) {
            console.log(property.property_type);

            return false
        }
        return true
    });
    if (!isValidProperties) return next(errorGenerator('Invalid values in the key', 400))

    const files = req.files
    if ((!files.property_images || properties.length != files.property_images.length) && are_properties_impacted === true) return next(errorGenerator('Evidence are Missing from the report', 400));

    const isPositive = deaths_count >= 0 && injured_count >= 0 && pregnant_women_count >= 0 && married_couples_count >= 0 && school_going_children_count >= 0 && disabled_persons_count >= 0;
    // humans section
    // 1. Basic Positivity & Impact Check
    if (are_humans_impacted) {
        if (total_residents_count <= 0) return next(errorGenerator('Total residents must be greater than zero', 400));
        if (!isPositive) return next(errorGenerator('Counts cannot be negative', 400));

        // 2. The Absolute Limit (Deaths)
        if (deaths_count > total_residents_count) {
            return next(errorGenerator('Deaths cannot exceed total residents', 400));
        }

        const living_residents = total_residents_count - deaths_count;

        // 3. Individual Category Checks (Cannot exceed survivors)
        // Note: Use (married_couples_count * 2) if you are counting pairs vs individuals
        const exceedsSurvivors =
            injured_count > living_residents ||
            pregnant_women_count > living_residents ||
            (married_couples_count * 2) > living_residents ||
            school_going_children_count > living_residents ||
            disabled_persons_count > living_residents;

        if (exceedsSurvivors) {
            return next(errorGenerator('Individual impact categories cannot exceed the number of living residents', 400));
        }

    }
    // ANIMALS VALIDATION
    if (are_animals_impacted === true) {
        // 1. Check for negative numbers first
        const hasNegative = small_animals_death_count < 0 || small_animals_injured_count < 0 || big_animals_death_count < 0 || big_animals_injured_count < 0;

        if (hasNegative) {
            return next(errorGenerator('Animal fields cannot be negative', 400));
        }

        // 2. Check if the total impact is zero
        const totalImpact = small_animals_death_count + small_animals_injured_count + big_animals_death_count + big_animals_injured_count;

        if (totalImpact === 0) {
            return next(errorGenerator('If animals are affected, the count cannot be zero', 400));
        }
    }

    const coordinates = location.split(/[,\s]+/)
    const latitude = parseFloat(coordinates[0]);
    const longitude = parseFloat(coordinates[1]);
    try {
        client = await pool.connect();
        await client.query('BEGIN');
        // insert into disasters 
        const chkDbResponse = await client.query('SELECT * FROM DISASTERS WHERE DISASTER_TYPE = $1', [disaster_type])
        let d_id = null;
        if (chkDbResponse.rows.length) {
            d_id = chkDbResponse.rows[0].d_id
        }
        else {
            const new_dis_rec = await client.query(`INSERT INTO DISASTERS(DISASTER_TYPE) VALUES($1) RETURNING D_ID`, [disaster_type])
            d_id = new_dis_rec.rows[0].d_id;
        }
        // insert into reports 
        const newReportResponse = await client.query(`INSERT INTO REPORTS(U_ID,D_ID,LATITUDE,LONGITUDE) VALUES($1,$2,$3,$4) RETURNING REPORT_ID`, [user.user_id, d_id, latitude, longitude])
        const report_id = newReportResponse.rows[0].report_id

        // till now all the nessasory info will be saved but now we need to insert impacts to the db
        //  are humans_impacted impacted if true
        if (are_humans_impacted === true) {
            await client.query(`INSERT INTO HUMAN_IMPACTS(REPORT_ID,TOTAL_RESIDENTS_COUNT,DEATHS_COUNT,INJURED_COUNT,PREGNANT_WOMEN_COUNT,DISABLED_PERSONS_COUNT,SCHOOL_GOING_CHILDREN_COUNT,MARRIED_COUPLES_COUNT) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [report_id, total_residents_count, deaths_count, injured_count, pregnant_women_count, disabled_persons_count, school_going_children_count, married_couples_count])
        }
        // animals impact insertion
        if (are_animals_impacted === true) {
            await client.query(`INSERT INTO ANIMAL_IMPACTS(REPORT_ID,BIG_ANIMALS_DEATH_COUNT,BIG_ANIMALS_INJURED_COUNT,SMALL_ANIMALS_DEATH_COUNT,SMALL_ANIMALS_INJURED_COUNT) VALUES($1,$2,$3,$4,$5)`, [report_id, big_animals_death_count, big_animals_injured_count, small_animals_death_count, small_animals_injured_count])
        }
        // property impact insertion 
        if (are_properties_impacted === true) {
            const finalizedProperties = await Promise.all(
                properties.map(async (prop, index) => {
                    const file = req.files.property_images[index];

                    // Upload to Cloudinary using your existing function
                    const cloudinaryResult = await uploadOnCloudinary(file.path, 'property_impacts');
                    uploadedImages.push({
                        property_index: index, public_id: cloudinaryResult.public_id,
                        secure_url: cloudinaryResult.secure_url
                    })

                    return {
                        ...prop,
                        image_url: cloudinaryResult.secure_url,
                        public_id: cloudinaryResult.public_id
                    };
                })
            );

            for (const prop of finalizedProperties) {
                console.log(prop.public_id, typeof (prop.public_id));

                await client.query(`INSERT INTO PROPERTY_IMPACTS(REPORT_ID,PROPERTY_TYPE,IMPACT_LEVEL,EVIDENCE_IMAGE_URL,photo_public_id) VALUES($1,$2,$3,$4,$5)`, [report_id, prop.property_type, prop.damage_level, prop.image_url, prop.public_id])
            }
        }
        client.query('COMMIT');

        res.status(201).json({
            msg: "Report was filed successfully."
        });

    } catch (error) {
        client.query('ROLLBACK');

        for (const image of uploadedImages) {
            try {
                await deleteFromCloudinary(image.public_id)
                console.log(`deleted image ${image.public_id}`);

            } catch (deleteError) {
                console.log(`failed to delete image ${image.public_id}`, deleteError);

            }
        }
        console.log(error);
        if (error.constraint === 'val_disaster_type') {
            return next(errorGenerator('Invalid disaster type', 400))
        }

        return next(errorGenerator("Something went wrong while inserting the report", 500));

    } finally {
        // Release the client back to the pool
        if (client) {
            client.release();
        }
    }
};
module.exports = { postReport, isValidCoordinates };