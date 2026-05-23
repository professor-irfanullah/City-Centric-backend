/*
    const { pool } = require("../../config/db")
    const { errorGenerator } = require("../../utils/errorGenarator")
    const { updateAnimalsRecord } = require("../../utils/updateanimalsImpact")
    const { updateDisasterType } = require("../../utils/updateDisasterType")
    const { updateProperties } = require("../../utils/updatePropertyImpacts")
    const { updateGpsLocation } = require("../../utils/updateReportLocation")
    const { updateHumanImpact } = require("../../utils/updateUserHumanImpact")
    const { updatePersonalInfo } = require("../../utils/updateUserPersonalInfo")

    const modifyReport = async (req, res, next) => {
        if (!req.body || !req.body.report_data) {
            throw (errorGenerator('Missing Payload Data', 400))
        }

        // the overall responses of each handler
        const status = []
        req.status = status;

        // the request body
        const { name, father_name, email, cnic, phone_number, muhalla, village, tehsil, district, disaster_type, location, are_animals_impacted, big_animals_death_count, big_animals_injured_count, small_animals_death_count, small_animals_injured_count, are_properties_impacted, property_details, are_humans_impacted, total_residents_count, deaths_count, injured_count, pregnant_women_count, disabled_persons_count, school_going_children_count, married_couples_count, reported_by, report_id } = JSON.parse(req.body.report_data)
        // stages of modifications => personal, disaster, report, animals_impact, property_impacts, human_impacts
        // the personal_part 1st
        const personalData = { name, father_name, email, cnic, phone_number, muhalla, village, tehsil, district, reported_by };
        req.personalData = personalData

        // the human_impact data
        const humanData = { are_humans_impacted, total_residents_count, deaths_count, injured_count, pregnant_women_count, disabled_persons_count, school_going_children_count, married_couples_count, report_id };
        req.humanData = humanData

        // the animal_imact data
        const animalsData = { are_animals_impacted, big_animals_death_count, big_animals_injured_count, small_animals_death_count, small_animals_injured_count, report_id }
        req.animalsData = animalsData

        // the disaster data
        const disasterData = { disaster_type, report_id }
        req.disasterData = disasterData

        // the disaster location gps data
        req.location = location
        req.report_id = report_id;

        // the properties data
        const propertiresData = { are_properties_impacted, property_details }
        req.properties = propertiresData;

        let client = null;

        // validate if every catagory is absent

        if (are_animals_impacted === false && are_humans_impacted === false && are_properties_impacted === false) {
            console.log('each catagory is false');

            throw errorGenerator('Atleast one report catagory must be reported', 400)
        }

        try {

            client = await pool.connect()
            await client.query('BEGIN')
            // the personal part is done here
            const personalPart = await updatePersonalInfo(req, client)

            // // now the human impact part is done here
            const humanImpactPart = await updateHumanImpact(req, client);

            // // // now the animal part
            const animalsPart = await updateAnimalsRecord(req, client);

            // // // now the disaster type
            const disasterTypePart = await updateDisasterType(req, client)

            // // // now the disaster location gps
            const gpsPart = await updateGpsLocation(req, client)

            // // now for the properties
            const properrties_part = await updateProperties(req, client)
            await client.query('COMMIT')


            res.json(req.status)

        } catch (error) {
            if (client) {
                await client.query('ROLLBACK');
            }
            console.error('Modification Error:', error);

            // This 'error' now contains the specific message and status 
            // from your utility (e.g., "Invalid CNIC" or "User not found")
            next(error);
        } finally {
            if (client) {
                client.release();
            }
        }

    }
    module.exports = { modifyReport }
*/
const { pool } = require("../../config/db")
const { errorGenerator } = require("../../utils/errorGenarator")
const { updateAnimalsRecord } = require("../../utils/updateanimalsImpact")
const { updateDisasterType } = require("../../utils/updateDisasterType")
const { updateProperties } = require("../../utils/updatePropertyImpacts")
const { updateGpsLocation } = require("../../utils/updateReportLocation")
const { updateHumanImpact } = require("../../utils/updateUserHumanImpact")
const { updatePersonalInfo } = require("../../utils/updateUserPersonalInfo")

const modifyReport = async (req, res, next) => {
    let client = null;

    try {
        // 1. Basic check for body existence
        if (!req.body || !req.body.report_data) {
            return next(errorGenerator('Missing Payload Data', 400));
        }

        // 2. Risk Mitigation: Safe JSON Parsing
        let parsedData;
        try {
            parsedData = JSON.parse(req.body.report_data);
        } catch (parseErr) {
            return next(errorGenerator('Invalid JSON format in report_data', 400));
        }

        // Destructure from the safely parsed object
        const {
            name, father_name, email, cnic, phone_number, muhalla, village, tehsil, district,
            disaster_type, location, are_animals_impacted, big_animals_death_count,
            big_animals_injured_count, small_animals_death_count, small_animals_injured_count,
            are_properties_impacted, property_details, are_humans_impacted, total_residents_count,
            deaths_count, injured_count, pregnant_women_count, disabled_persons_count,
            school_going_children_count, married_couples_count, reported_by, report_id
        } = parsedData;

        // 3. Validation Logic (Handles boolean or potential "false" strings)
        const hasAnimals = are_animals_impacted === true || are_animals_impacted === 'true';
        const hasHumans = are_humans_impacted === true || are_humans_impacted === 'true';
        const hasProperties = are_properties_impacted === true || are_properties_impacted === 'true';

        if (!hasAnimals && !hasHumans && !hasProperties) {
            return next(errorGenerator('At least one report category must be reported', 400));
        }

        // 4. Data Assignment to req object for utilities
        req.status = [];
        req.report_id = report_id;
        req.location = location;

        req.personalData = { name, father_name, email, cnic, phone_number, muhalla, village, tehsil, district, reported_by };
        req.humanData = { are_humans_impacted, total_residents_count, deaths_count, injured_count, pregnant_women_count, disabled_persons_count, school_going_children_count, married_couples_count, report_id };
        req.animalsData = { are_animals_impacted, big_animals_death_count, big_animals_injured_count, small_animals_death_count, small_animals_injured_count, report_id };
        req.disasterData = { disaster_type, report_id };
        req.properties = { are_properties_impacted, property_details };

        // 5. Database Transaction
        client = await pool.connect();
        await client.query('BEGIN');

        // Execute utility updates sequentially
        await updatePersonalInfo(req, client);
        await updateHumanImpact(req, client);
        await updateAnimalsRecord(req, client);
        await updateDisasterType(req, client);
        await updateGpsLocation(req, client);
        await updateProperties(req, client);

        await client.query('COMMIT');

        res.json(req.status);

    } catch (error) {
        // Rollback only if transaction was initiated
        if (client) {
            await client.query('ROLLBACK');
        }
        console.error('Modification Error:', error);
        next(error);
    } finally {
        if (client) {
            client.release();
        }
    }
};

module.exports = { modifyReport };
