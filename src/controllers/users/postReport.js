const { pool } = require("../../config/db");
const { errorGenerator } = require("../../utils/errorGenarator");
const { uploadOnCloudinary, deleteFromCloudinary } = require('../../utils/cloudinary');

const toBoolean = (value) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
};

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

    try {
        const homeImages = req.files?.home_images || [];
        const shopImages = req.files?.shop_images || [];

        // check for disaster_type
        const disasters = ["flood", "earthquake", "land_slide", "fire"];
        // check for damage_level
        const levels_of_damage = ["minor", "major", "fully_destroyed"];

        // Apply normalization
        req.body.are_animals_impacted = toBoolean(req.body.are_animals_impacted);
        req.body.is_home_impacted = toBoolean(req.body.is_home_impacted);
        req.body.is_shop_impacted = toBoolean(req.body.is_shop_impacted);

        // Destructure AND parse numeric values once
        const {
            disaster_type,
            location,
            are_animals_impacted,
            is_home_impacted,
            home_damage_level,
            is_shop_impacted,
            shop_damage_level,
        } = req.body;

        // Parse counts to integers immediately
        const big_animals_death_count =
            parseInt(req.body.big_animals_death_count, 10) || 0;
        const small_animals_death_count =
            parseInt(req.body.small_animals_death_count, 10) || 0;
        const small_animals_injured_count =
            parseInt(req.body.small_animals_injured_count, 10) || 0;
        const big_animals_injured_count =
            parseInt(req.body.big_animals_injured_count, 10) || 0;
        const total_residents_count = parseInt(req.body.total_residents_count, 10);
        const deaths_count = parseInt(req.body.deaths_count, 10) || 0;
        const injured_count = parseInt(req.body.injured_count, 10) || 0;
        const pregnant_women_count = parseInt(req.body.pregnant_women_count, 10) || 0;
        const disabled_persons_count =
            parseInt(req.body.disabled_persons_count, 10) || 0;
        const school_going_children_count =
            parseInt(req.body.school_going_children_count, 10) || 0;
        const married_couples_count =
            parseInt(req.body.married_couples_count, 10) || 0;

        // VALIDATIONS (all return next() is fine here since we're before the transaction)
        if (!disasters.includes(disaster_type)) {
            return next(errorGenerator("Invalid disaster type was Entered", 400));
        }
        if (!location) {
            return next(errorGenerator("Location is required", 400));
        }

        const isLocationValid = isValidCoordinates(location);
        if (!isLocationValid) {
            return next(errorGenerator("Invalid Location", 400));
        }

        if (typeof are_animals_impacted !== "boolean") {
            return next(
                errorGenerator(
                    "Missing animals impacted information whether true or false",
                    400
                )
            );
        }

        const totalAnimalIssues =
            big_animals_death_count +
            big_animals_injured_count +
            small_animals_death_count +
            small_animals_injured_count;

        if (are_animals_impacted && totalAnimalIssues === 0) {
            return next(
                errorGenerator(
                    "Violation of policy encountered: Counts must be provided if animals were impacted",
                    403
                )
            );
        }
        if (are_animals_impacted === false && totalAnimalIssues > 0) {
            return next(
                errorGenerator(
                    "Violation of policy encountered: Counts provided when animals were reported as not impacted",
                    403
                )
            );
        }

        if (isNaN(total_residents_count) || total_residents_count <= 0) {
            return next(
                errorGenerator(
                    "Violation Encountered in the family about information, residents cannot be zero or empty",
                    403
                )
            );
        }

        if (is_home_impacted && !levels_of_damage.includes(home_damage_level)) {
            return next(errorGenerator("Invalid home damage level", 400));
        }

        if (is_shop_impacted && !levels_of_damage.includes(shop_damage_level)) {
            return next(errorGenerator("Invalid shop damage level", 400));
        }

        // Validate family counts
        const familyCounts = {
            deaths: deaths_count,
            injured: injured_count,
            disabled: disabled_persons_count,
            schoolChildren: school_going_children_count,
            pregnantWomen: pregnant_women_count,
        };

        for (const type in familyCounts) {
            const count = familyCounts[type];
            if (count < 0 || count > total_residents_count) {
                return next(
                    errorGenerator(
                        `Invalid count for ${type}: cannot be negative or greater than total residents`,
                        400
                    )
                );
            }
        }

        if (deaths_count + injured_count > total_residents_count) {
            return next(
                errorGenerator(
                    "Total deaths and injured cannot exceed total residents",
                    400
                )
            );
        }

        if (married_couples_count * 2 > total_residents_count) {
            return next(
                errorGenerator(
                    "Total people in married couples cannot exceed total residents",
                    400
                )
            );
        }

        if (is_home_impacted === true && homeImages.length !== 1) {
            return next(
                errorGenerator(
                    "At least 1 home image is required when home is impacted",
                    400
                )
            );
        }

        if (is_shop_impacted === true && shopImages.length !== 1) {
            return next(
                errorGenerator(
                    "At least 1 shop image is required when shop is impacted",
                    400
                )
            );
        }

        // Start transaction
        client = await pool.connect();
        await client.query('BEGIN');

        const insertQuery = `
            INSERT INTO DISASTER_REPORT (
                REPORTER_ID, 
                DISASTER_TYPE, 
                LOCATION,
                ARE_ANIMALS_IMPACTED,
                BIG_ANIMALS_DEATH_COUNT, 
                BIG_ANIMALS_INJURED_COUNT,
                SMALL_ANIMALS_DEATH_COUNT, 
                SMALL_ANIMALS_INJURED_COUNT,
                IS_HOME_IMPACTED, 
                HOME_DAMAGE_LEVEL,
                IS_SHOP_IMPACTED, 
                SHOP_DAMAGE_LEVEL,
                TOTAL_RESIDENTS_COUNT, 
                DEATHS_COUNT, 
                INJURED_COUNT,
                PREGNANT_WOMEN_COUNT, 
                DISABLED_PERSONS_COUNT,
                SCHOOL_GOING_CHILDREN_COUNT, 
                MARRIED_COUPLES_COUNT,
                home_image_url,
                home_image_public_id,
                shop_image_url,
                shop_image_public_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
            RETURNING *
        `;

        let homeImageUrl = null;
        let homeImagePublicId = null;
        let shopImageUrl = null;
        let shopImagePublicId = null;

        // 1. Conditional Home Upload
        if (is_home_impacted === true) {
            if (!req.files?.home_images?.[0]) {
                throw errorGenerator("Home image is required when home is impacted", 400);
            }

            const result = await uploadOnCloudinary(req.files.home_images[0].path, 'home_damage');

            if (!result) {
                throw errorGenerator("Failed to upload home damage image", 500);
            }

            homeImageUrl = result.secure_url;
            homeImagePublicId = result.public_id;
            uploadedImages.push({ publicId: result.public_id, type: 'home' });
        }

        // 2. Conditional Shop Upload
        if (is_shop_impacted === true) {
            if (!req.files?.shop_images?.[0]) {
                throw errorGenerator("Shop image is required when shop is impacted", 400);
            }

            const result = await uploadOnCloudinary(req.files.shop_images[0].path, 'shop_damage');

            if (!result) {
                throw errorGenerator("Failed to upload shop damage image", 500);
            }

            shopImageUrl = result.secure_url;
            shopImagePublicId = result.public_id;
            uploadedImages.push({ publicId: result.public_id, type: 'shop' });
        }

        // Insert into database
        const response = await client.query(insertQuery, [
            user.user_id,
            disaster_type,
            location,
            are_animals_impacted,
            big_animals_death_count,
            big_animals_injured_count,
            small_animals_death_count,
            small_animals_injured_count,
            is_home_impacted,
            home_damage_level,
            is_shop_impacted,
            shop_damage_level,
            total_residents_count,
            deaths_count,
            injured_count,
            pregnant_women_count,
            disabled_persons_count,
            school_going_children_count,
            married_couples_count,
            homeImageUrl,
            homeImagePublicId,
            shopImageUrl,
            shopImagePublicId
        ]);

        await client.query('COMMIT');

        res.json({
            msg: "Report was filed successfully.",
            report: response.rows[0]
        });

    } catch (error) {
        // Rollback transaction
        if (client) {
            await client.query('ROLLBACK');
        }

        // Clean up any uploaded images from Cloudinary
        if (uploadedImages.length > 0) {
            console.log(`Cleaning up ${uploadedImages.length} uploaded images due to error...`);
            for (const image of uploadedImages) {
                await deleteFromCloudinary(image.publicId);
            }
        }

        // Log the error
        console.error('Error in postReport:', error);

        // Pass the error to the error handler
        if (error.statusCode) {
            return next(error);
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