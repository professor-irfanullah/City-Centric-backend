const { query } = require('../../config/db');
const { errorGenerator } = require('../../utils/errorGenarator');

const fetchReport = async (req, res, next) => {
    const { reportId } = req.query;

    // Use Number.isInteger for stricter validation
    if (!reportId || isNaN(Number(reportId))) {
        return next(errorGenerator('Invalid Input received', 400));
    }

    const fetchQuery = `
SELECT
    U.NAME,
    U.FATHER_NAME,
    U.EMAIL,
    U.CNIC,
    U.PHONE_NUMBER,
    U.MUHALLA,
    U.VILLAGE,
    INITCAP(U.TEHSIL) AS TEHSIL,
    INITCAP(U.DISTRICT) AS DISTRICT,
    R.REPORT_ID,
	R.U_ID AS REPORTED_BY,
    D.DISASTER_TYPE,
    CONCAT(R.LATITUDE, ',', R.LONGITUDE) AS LOCATION,
    R.SUBMISSION_DATE,
	R.STATUS AS verification_status,
    EXISTS (SELECT 1 FROM ANIMAL_IMPACTS AI2 WHERE R.REPORT_ID = AI2.REPORT_ID) AS ARE_ANIMALS_IMPACTED,
    COALESCE(AI.BIG_ANIMALS_DEATH_COUNT, 0) AS BIG_ANIMALS_DEATH_COUNT,
    COALESCE(AI.BIG_ANIMALS_INJURED_COUNT, 0) AS BIG_ANIMALS_INJURED_COUNT,
    COALESCE(AI.SMALL_ANIMALS_DEATH_COUNT, 0) AS SMALL_ANIMALS_DEATH_COUNT,
    COALESCE(AI.SMALL_ANIMALS_INJURED_COUNT, 0) AS SMALL_ANIMALS_INJURED_COUNT,
    EXISTS (SELECT 1 FROM PROPERTY_IMPACTS PI2 WHERE PI2.REPORT_ID = R.REPORT_ID) AS ARE_PROPERTIES_IMPACTED,
    -- THE FIX: Filter nulls inside agg, then COALESCE the whole result to []
    COALESCE(
        jsonb_agg(
            jsonb_build_object('impact_id',PI.IMPACT_ID,'REPORT_ID',PI.REPORT_ID,'property_type', PI.property_type, 'impact_level', PI.IMPACT_LEVEL,'evidence_image_url',PI.EVIDENCE_IMAGE_URL)
        ) FILTER (WHERE PI.REPORT_ID IS NOT NULL), 
        '[]'::jsonb
    ) AS PROPERTY_DETAILS,
	EXISTS(SELECT 1 FROM HUMAN_IMPACTS HI2 WHERE HI2.REPORT_ID = R.REPORT_ID) AS ARE_HUMANS_IMPACTED,
	COALESCE(HI.TOTAL_RESIDENTS_COUNT, 0) as total_residents_count,
	COALESCE(HI.DEATHS_COUNT, 0) as deaths_count,
	COALESCE(HI.INJURED_COUNT, 0) as injured_count,
	COALESCE(HI.PREGNANT_WOMEN_COUNT, 0) as pregnant_women_count,
	COALESCE(HI.DISABLED_PERSONS_COUNT, 0) as disabled_persons_count,
	COALESCE(HI.SCHOOL_GOING_CHILDREN_COUNT, 0) as school_going_children_count,
	COALESCE(HI.MARRIED_COUPLES_COUNT, 0) as married_couples_count
	--R.REPORT_STATUS AS verification_status
	
FROM REPORTS R
INNER JOIN USERS U ON R.U_ID = U.USER_ID
JOIN DISASTERS D ON D.D_ID = R.D_ID
LEFT JOIN PROPERTY_IMPACTS PI ON PI.REPORT_ID = R.REPORT_ID -- Changed to LEFT JOIN
LEFT JOIN ANIMAL_IMPACTS AI ON AI.REPORT_ID = R.REPORT_ID
LEFT JOIN HUMAN_IMPACTS HI ON HI.REPORT_ID = R.REPORT_ID
WHERE
	R.REPORT_ID = $1
GROUP BY 
    U.USER_ID, R.REPORT_ID, D.D_ID, AI.A_ID,hi.total_residents_count,hi.deaths_count,
	hi.injured_count,HI.DISABLED_PERSONS_COUNT,HI.SCHOOL_GOING_CHILDREN_COUNT,HI.PREGNANT_WOMEN_COUNT,
	HI.MARRIED_COUPLES_COUNT
	-- Groups all non-aggregated columns
ORDER BY
    R.SUBMISSION_DATE DESC;`;

    try {
        const { rows } = await query(fetchQuery, [reportId]);

        if (rows.length > 0) {
            return res.status(200).json(rows[0]);
        }

        return next(errorGenerator('Report not found', 404));
    } catch (error) {
        console.error("Database Error:", error);
        return next(errorGenerator('Something went wrong while fetching the report', 500));
    }
};

module.exports = { fetchReport };
