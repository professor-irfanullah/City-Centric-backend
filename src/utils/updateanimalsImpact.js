const { query, pool } = require("../config/db");
const { errorGenerator } = require("./errorGenarator");

const updateAnimalsRecord = async (req, client) => {
    const allowedKeys = [
        'are_animals_impacted',
        'big_animals_death_count',
        'big_animals_injured_count',
        'small_animals_death_count',
        'small_animals_injured_count',
        'report_id'
    ];

    const errors = [];

    // 1. Key and Type Validations
    for (const [key, value] of Object.entries(req.animalsData)) {
        if (allowedKeys.includes(key) === false) {
            errors.push(`Invalid Field detected: ${key}`);
            continue;
        }
        if (key === 'are_animals_impacted') {
            if (typeof value !== 'boolean') errors.push(`${key} must be boolean`);
        } else {
            if (typeof value !== 'number' || value < 0) {
                errors.push(`${key} must be a non-negative number.`);
            }
        }
    }

    // 2. Logical Cross-Checks (Only if types are okay)
    if (errors.length === 0) {
        const {
            are_animals_impacted: isImpacted,
            big_animals_death_count: bigDeath = 0,
            big_animals_injured_count: bigInjured = 0,
            small_animals_death_count: smallDeath = 0,
            small_animals_injured_count: smallInjured = 0
        } = req.animalsData;

        const totalImpactCount = bigDeath + bigInjured + smallDeath + smallInjured;

        // Rule: If flag is FALSE, counts must be 0
        if (isImpacted === false && totalImpactCount > 0) {
            errors.push("Logic Error: 'are_animals_impacted' is false, but animal counts are greater than zero.");
        }

        // Rule: If flag is TRUE, at least one animal must be dead or injured
        if (isImpacted === true && totalImpactCount === 0) {
            errors.push("Logic Error: 'are_animals_impacted' is true, but no animal deaths or injuries were reported.");
        }
    }

    // 3. Final Decision
    if (errors.length > 0) {
        throw (errorGenerator(errors.join(' | '), 400));
    }
    // console.log("Animal rec
    // ord verified.");
    try {
        const response = await client.query('SELECT A_ID FROM ANIMAL_IMPACTS WHERE REPORT_ID = $1', [req.animalsData.report_id])
        let animals_id = response.rows.length > 0 ? response.rows[0].a_id : null;
        if (response.rowCount === 0 && req.animalsData.are_animals_impacted === true) {
            const response = await client.query('INSERT INTO ANIMAL_IMPACTS(REPORT_ID,BIG_ANIMALS_DEATH_COUNT,BIG_ANIMALS_INJURED_COUNT,SMALL_ANIMALS_DEATH_COUNT,SMALL_ANIMALS_INJURED_COUNT) VALUES($1,$2,$3,$4,$5) RETURNING A_ID', [req.animalsData.report_id, req.animalsData.big_animals_death_count, req.animalsData.big_animals_injured_count, req.animalsData.small_animals_death_count, req.animalsData.small_animals_injured_count]);
            animals_id = response.rows[0].a_id
            req.status.push('Created animal impacts record for the report')
        }
        else if (response.rowCount > 0 && req.animalsData.are_animals_impacted === true) {

            const updResponse = await client.query('UPDATE ANIMAL_IMPACTS SET BIG_ANIMALS_DEATH_COUNT = $1, BIG_ANIMALS_INJURED_COUNT = $2, SMALL_ANIMALS_DEATH_COUNT = $3, SMALL_ANIMALS_INJURED_COUNT = $4, UPDATED_AT = NOW() WHERE A_ID = $5', [req.animalsData.big_animals_death_count, req.animalsData.big_animals_injured_count, req.animalsData.small_animals_death_count, req.animalsData.small_animals_injured_count, animals_id])
            req.status.push('Updated animal impacts record for the report')
        }
        if (req.animalsData.are_animals_impacted === false && response.rows.length > 0) {
            const response = await client.query('DELETE FROM ANIMAL_IMPACTS WHERE A_ID = $1', [animals_id])
            req.status.push('Deleted animal impacts record from the report')
        }
    } catch (error) {
        if (error.statusCode) throw error;
        console.log(error);
        throw (errorGenerator('Something went wrong while updating animals part', 500))
    }
};

module.exports = { updateAnimalsRecord };
