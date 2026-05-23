const { query, pool } = require("../config/db");
const { errorGenerator } = require("./errorGenarator");

const updateHumanImpact = async (req, client) => {
    // 1. Define schema
    const allowedKeys = [
        'total_residents_count', 'deaths_count', 'injured_count',
        'pregnant_women_count', 'disabled_persons_count',
        'school_going_children_count', 'married_couples_count',
        'are_humans_impacted', 'report_id'
    ];

    const errors = [];

    // 2. Loop: Strict Key & Type Validation
    for (const [key, value] of Object.entries(req.humanData)) {
        if (!allowedKeys.includes(key)) {
            errors.push(`Invalid field detected: ${key}`);
            continue;
        }

        if (key === 'are_humans_impacted') {
            if (typeof value !== 'boolean') errors.push(`${key} must be boolean.`);
        } else {
            if (typeof value !== 'number' || value < 0) {
                errors.push(`${key} must be a non-negative number.`);
            }
        }
    }

    // 3. Logic Cross-Checks (Only runs if types are correct)
    if (errors.length === 0) {
        const {
            total_residents_count: total,
            deaths_count: deaths,
            injured_count: injured,
            married_couples_count: couples,
            are_humans_impacted: isImpacted
        } = req.humanData;

        // Rule A: Individual counts vs Total
        const subCounts = [
            'deaths_count', 'injured_count', 'pregnant_women_count',
            'disabled_persons_count', 'school_going_children_count'
        ];

        subCounts.forEach(key => {
            if (req.humanData[key] > total) {
                errors.push(`${key} (${req.humanData[key]}) cannot exceed total residents (${total})`);
            }
        });

        // Rule B: Married individuals vs Total (2 people per couple)
        if ((couples * 2) > total) {
            errors.push(`Married individuals (${couples * 2}) exceed total residents (${total})`);
        }

        // Rule C: Mutually exclusive physical impact (Death + Injury)
        if ((deaths + injured) > total) {
            errors.push("Combined deaths and injuries exceed total residents");
        }

        // Rule D: Global Impact Flag Consistency
        if (isImpacted === false) {
            const hasData = subCounts.concat('married_couples_count').some(k => req.humanData[k] > 0);
            if (hasData) {
                errors.push("'are_humans_impacted' is false, but impact counts are detected.");
            }
        }


        // Rule E: Strict Physical Impact Check
        if (isImpacted === true) {
            // Only check deaths and injuries
            const hasPhysicalHarm = req.humanData.deaths_count > 0 || req.humanData.injured_count > 0;

            if (!hasPhysicalHarm) {
                errors.push("Logic Error: 'are_humans_impacted' is true, but no deaths or injuries were reported.");
            }
        }



    }

    // 4. Final Decision
    if (errors.length > 0) {
        throw (errorGenerator(errors.join(' | '), 400));
    }
    try {
        let human_impact_id = null
        const isExisting = await client.query('select h_id from human_impacts where report_id = $1', [req.humanData.report_id])
        human_impact_id = isExisting.rows.length ? isExisting.rows[0].h_id : null
        if (isExisting.rowCount === 0 && req.humanData.are_humans_impacted === true) {
            const response = await client.query('INSERT INTO HUMAN_IMPACTS(TOTAL_RESIDENTS_COUNT,DEATHS_COUNT,INJURED_COUNT,PREGNANT_WOMEN_COUNT,DISABLED_PERSONS_COUNT,SCHOOL_GOING_CHILDREN_COUNT,MARRIED_COUPLES_COUNT,REPORT_ID)values($1,$2,$3,$4,$5,$6,$7,$8)', [req.humanData.total_residents_count, req.humanData.deaths_count, req.humanData.injured_count, req.humanData.pregnant_women_count, req.humanData.disabled_persons_count, req.humanData.school_going_children_count, req.humanData.married_couples_count, req.humanData.report_id])
            req.status.push('Inserted Human Impacts record for the report')

        }
        else if (req.humanData.are_humans_impacted === true && human_impact_id !== null) {
            human_impact_id = isExisting.rows[0].h_id;
            const response = await client.query('UPDATE HUMAN_IMPACTS SET TOTAL_RESIDENTS_COUNT = $1, DEATHS_COUNT = $2, INJURED_COUNT = $3, PREGNANT_WOMEN_COUNT = $4, DISABLED_PERSONS_COUNT = $5, SCHOOL_GOING_CHILDREN_COUNT = $6, married_couples_count = $7, UPDATED_AT = NOW() WHERE H_ID = $8', [req.humanData.total_residents_count, req.humanData.deaths_count, req.humanData.injured_count, req.humanData.pregnant_women_count, req.humanData.disabled_persons_count, req.humanData.school_going_children_count, req.humanData.married_couples_count, human_impact_id])
            req.status.push('Updated Human Impacts record for the report')

        }
        if (req.humanData.are_humans_impacted === false && isExisting.rows.length > 0) {
            const response = await client.query('DELETE FROM HUMAN_IMPACTS WHERE report_id = $1', [req.humanData.report_id])
            req.status.push('Deleted Human Impacts record for the report')
        }
    } catch (error) {
        if (error.statusCode) throw error;

        console.log(error);
        throw (errorGenerator('Failed to update human impact records', 500))
    }
};

module.exports = { updateHumanImpact };
