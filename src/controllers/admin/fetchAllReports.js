const { errorGenerator } = require('../../utils/errorGenarator.js');
const { query } = require('../../config/db');

const fetchAllReports = async (req, res, next) => {
    const startTime = Date.now();

    const insertionQuery = `
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
    D.DISASTER_TYPE,
    CONCAT(R.LATITUDE, ',', R.LONGITUDE) AS LOCATION,
    R.SUBMISSION_DATE,
	R.STATUS AS REPORT_STATUS,
    EXISTS (SELECT 1 FROM ANIMAL_IMPACTS AI2 WHERE R.REPORT_ID = AI2.REPORT_ID) AS ARE_ANIMALS_IMPACTED,
    COALESCE(AI.BIG_ANIMALS_DEATH_COUNT, 0) AS BIG_ANIMALS_DEATH_COUNT,
    COALESCE(AI.BIG_ANIMALS_INJURED_COUNT, 0) AS BIG_ANIMALS_INJURED_COUNT,
    COALESCE(AI.SMALL_ANIMALS_DEATH_COUNT, 0) AS SMALL_ANIMALS_DEATH_COUNT,
    COALESCE(AI.SMALL_ANIMALS_INJURED_COUNT, 0) AS SMALL_ANIMALS_INJURED_COUNT,
    EXISTS (SELECT 1 FROM PROPERTY_IMPACTS PI2 WHERE PI2.REPORT_ID = R.REPORT_ID) AS ARE_PROPERTIES_IMPACTED,
    -- THE FIX: Filter nulls inside agg, then COALESCE the whole result to []
    COALESCE(
        jsonb_agg(
            jsonb_build_object('impact_id',PI.IMPACT_ID,'REPORT_ID',PI.REPORT_ID,'property_type', PI.property_type, 'impact_level', PI.IMPACT_LEVEL,'PROPERTY_IMAGE_URL',PI.EVIDENCE_IMAGE_URL)
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
	-- R.REPORT_STATUS AS verification_status
	
FROM REPORTS R
INNER JOIN USERS U ON R.U_ID = U.USER_ID
JOIN DISASTERS D ON D.D_ID = R.D_ID
LEFT JOIN PROPERTY_IMPACTS PI ON PI.REPORT_ID = R.REPORT_ID -- Changed to LEFT JOIN
LEFT JOIN ANIMAL_IMPACTS AI ON AI.REPORT_ID = R.REPORT_ID
LEFT JOIN HUMAN_IMPACTS HI ON HI.REPORT_ID = R.REPORT_ID
GROUP BY 
    U.USER_ID, R.REPORT_ID, D.D_ID, AI.A_ID,hi.total_residents_count,hi.deaths_count,
	hi.injured_count,HI.DISABLED_PERSONS_COUNT,HI.SCHOOL_GOING_CHILDREN_COUNT,HI.PREGNANT_WOMEN_COUNT,
	HI.MARRIED_COUPLES_COUNT
	-- Groups all non-aggregated columns
ORDER BY
    R.SUBMISSION_DATE DESC`;  // Removed commented LIMIT

    try {
        const response = await query(insertionQuery, []);
        const executionTime = Date.now() - startTime;

        // Log performance for monitoring
        console.log(`Reports fetched: ${response.rows.length} rows in ${executionTime}ms`);

        // Set cache headers
        res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
        res.setHeader('Vary', 'Accept-Encoding');

        // Send response with metadata
        res.status(200).json({
            success: true,
            reports: response.rows,
            metadata: {
                total: response.rows.length,
                executionTimeMs: executionTime,
                timestamp: new Date().toISOString(),
                cached: false
            }
        });

    } catch (error) {
        console.error('Fetch all reports error:', error.message);
        console.error('Query:', insertionQuery); // Log query for debugging
        console.error('Stack:', error.stack);    // Log full stack

        return next(errorGenerator('Internal Server Error', 500));
    }
};
module.exports = { fetchAllReports }