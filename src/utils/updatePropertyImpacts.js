const { query, pool } = require("../config/db");
const { deleteFromCloudinary, uploadOnCloudinary } = require("./cloudinary");
const { errorGenerator } = require("./errorGenarator");

const fetchProperties = async (report_id, client) => {
    try {
        const response = await client.query('select * from property_impacts where report_id = $1', [report_id])
        return response.rows
    } catch (error) {
        throw error
    }
}
const updateProperties = async (req, client) => {
    let fileIndex = 0;
    const errors = [];

    try {
        // 1. Basic Validation
        if (typeof req.report_id !== 'number') throw (errorGenerator(['Invalid report Id'], 400));


        // 2. Get current state from Database
        const stored = await fetchProperties(req.report_id, client);
        const storedMap = new Map(stored.map(p => [p.impact_id, p]));

        // CASE A: No properties impacted - Wipe everything clean
        if (req.properties.are_properties_impacted === false) {
            for (const property of stored) {
                if (property.photo_public_id) await deleteFromCloudinary(property.photo_public_id);
                await client.query('DELETE FROM property_impacts WHERE impact_id = $1', [property.impact_id]);
            }
            req.status.push("Cleared all property impacts as status changed to 'not impacted'");
        }

        // CASE B: Properties are impacted - Sync Database with Payload
        else {
            const payload = req.properties.property_details || [];
            const propertyImages = req.files?.property_images || [];

            // STEP 1: CLEANUP (Delete records from DB/Cloudinary if they are missing from the payload)
            const incomingIds = new Set(payload.map(p => p.impact_id).filter(id => id != null));
            for (const [id, record] of storedMap) {
                if (!incomingIds.has(id)) {
                    if (record.photo_public_id) await deleteFromCloudinary(record.photo_public_id);
                    await client.query('DELETE FROM property_impacts WHERE impact_id = $1', [id]);
                    req.status.push(`Deleted removed property record: ${id}`);
                }
            }

            // STEP 2: SYNC (Insert New or Update Existing)
            for (const prop of payload) {
                const isExisting = prop.impact_id && storedMap.has(prop.impact_id);

                /**
                 * Logic for Image Replacement:
                 * - If brand new record (!isExisting) -> Must upload
                 * - If existing record AND URL is empty string ("") -> Replace image
                 */
                const isReplacingImage = !isExisting || prop.evidence_image_url === '';

                let imageUrl, publicId;

                if (isReplacingImage) {
                    const currentFile = propertyImages[fileIndex++];

                    if (!currentFile) {
                        errors.push(`Missing required file for property type: ${prop.property_type}`);
                        continue;
                    }

                    // If replacing an existing photo, delete the old one from Cloudinary first
                    if (isExisting) {
                        const oldData = storedMap.get(prop.impact_id);
                        if (oldData.photo_public_id) await deleteFromCloudinary(oldData.photo_public_id);
                    }

                    const upload = await uploadOnCloudinary(currentFile.path, 'property_impacts');
                    imageUrl = upload.secure_url;
                    publicId = upload.public_id;
                } else {
                    // Use existing DB data (No image change requested)
                    const existing = storedMap.get(prop.impact_id);
                    imageUrl = existing.evidence_image_url;
                    publicId = existing.photo_public_id;
                }

                if (isExisting) {
                    // Update existing row
                    await client.query(
                        `UPDATE property_impacts 
                         SET property_type = $1, impact_level = $2, evidence_image_url = $3, photo_public_id = $4 
                         WHERE impact_id = $5`,
                        [prop.property_type, prop.impact_level, imageUrl, publicId, prop.impact_id]
                    );
                    req.status.push(`Updated property: ${prop.property_type}`);
                } else {
                    // Insert new row
                    await client.query(
                        `INSERT INTO property_impacts (report_id, property_type, impact_level, evidence_image_url, photo_public_id) 
                         VALUES ($1, $2, $3, $4, $5)`,
                        [req.report_id, prop.property_type, prop.impact_level, imageUrl, publicId]
                    );
                    req.status.push(`Inserted new property: ${prop.property_type}`);
                }
            }
        }

        // Final check for errors before committing
        if (errors.length > 0) {
            throw (errorGenerator(errors.join(' | '), 400));
        }
    } catch (error) {
        if (error.statusCode) throw error;
        console.error("Critical Property Update Error:", error);
        throw (errorGenerator('Something went wrong while modifying the property records', 500));
    }
};


module.exports = { updateProperties }