const { query } = require("../../config/db")
const { errorGenerator } = require("../../utils/errorGenarator")

const getAllPostedReports = async (req, res, next) => {
	const user = req.user
	const fetchingQuery = `
SELECT
	U.PHONE_NUMBER,
	U.USER_ID,
	-- Count distinct report IDs to prevent inflation from multi-row impacts
	COUNT(DISTINCT R.REPORT_ID) AS TOTAL_REPORTS,
	COUNT(DISTINCT R.REPORT_ID) FILTER (
		WHERE
			R.STATUS = 'Verified'
	) AS TOTAL_VERIFIED_REPORTS,
	COUNT(DISTINCT R.REPORT_ID) FILTER (
		WHERE
			R.STATUS = 'Pending'
	) AS TOTAL_PENDING_REPORTS,
	COALESCE(
		JSONB_AGG(
			JSONB_BUILD_OBJECT(
				'report_id',
				R.REPORT_ID,
				'reporter_id',
				R.U_ID,
				'disaster_type',
				D.DISASTER_TYPE,
				'location',
				CONCAT(R.LATITUDE, ', ', R.LONGITUDE),
				'status',
				R.STATUS,
				'created_at',
				R.SUBMISSION_DATE,
				-- 1. SUMMED HUMAN TOTALS (Safe for multiple families)
				'human_summary',
				(
					SELECT
						JSONB_BUILD_OBJECT(
							'total_deaths',
							COALESCE(SUM(HI.DEATHS_COUNT), 0),
							'total_injured',
							COALESCE(SUM(HI.INJURED_COUNT), 0),
							'total_residents',
							COALESCE(SUM(HI.TOTAL_RESIDENTS_COUNT), 0),
							'record_count',
							COUNT(*),
							'total_pregnant_womens',
							COALESCE(SUM(HI.PREGNANT_WOMEN_COUNT), 0),
							'total_injured_count',
							COALESCE(SUM(HI.INJURED_COUNT), 0),
							'total_disabled_persons_count',
							COALESCE(SUM(HI.DISABLED_PERSONS_COUNT), 0),
							'total_school_going_children_count',
							COALESCE(SUM(HI.SCHOOL_GOING_CHILDREN_COUNT), 0),
							'total_married_couples_count',
							COALESCE(SUM(HI.MARRIED_COUPLES_COUNT), 0)
						)
					FROM
						HUMAN_IMPACTS HI
					WHERE
						HI.REPORT_ID = R.REPORT_ID
				),
				-- 2. SUMMED ANIMAL TOTALS (Safe for multiple livestock entries)
				'animal_summary',
				(
					SELECT
						JSONB_BUILD_OBJECT(
							'big_deaths',
							COALESCE(SUM(AI.BIG_ANIMALS_DEATH_COUNT), 0),
							'big_injured',
							COALESCE(SUM(AI.BIG_ANIMALS_INJURED_COUNT), 0),
							'small_deaths',
							COALESCE(SUM(AI.SMALL_ANIMALS_DEATH_COUNT), 0),
							'small_injured',
							COALESCE(SUM(AI.SMALL_ANIMALS_INJURED_COUNT), 0),
							'are_animals_impacted',
							EXISTS (
								SELECT
									1
								FROM
									ANIMAL_IMPACTS
								WHERE
									REPORT_ID = R.REPORT_ID
							)
						)
					FROM
						ANIMAL_IMPACTS AI
					WHERE
						AI.REPORT_ID = R.REPORT_ID
				),
				-- 3. NESTED PROPERTY LIST (Shows every house and shop)
				'property_details',
				COALESCE(
					(
						SELECT
							JSONB_AGG(
								JSONB_BUILD_OBJECT(
									'type',
									PI.PROPERTY_TYPE,
									'level',
									PI.IMPACT_LEVEL,
									'image',
									PI.EVIDENCE_IMAGE_URL
								)
							)
						FROM
							PROPERTY_IMPACTS PI
						WHERE
							PI.REPORT_ID = R.REPORT_ID
					),
					'[]'::JSONB
				),
				-- 4. PROPERTY COUNTS (Quick reference)
				'house_count',
				(
					SELECT
						COUNT(*)
					FROM
						PROPERTY_IMPACTS PI
					WHERE
						PI.REPORT_ID = R.REPORT_ID
						AND PI.PROPERTY_TYPE = 'House'
				),
				'shop_count',
				(
					SELECT
						COUNT(*)
					FROM
						PROPERTY_IMPACTS PI
					WHERE
						PI.REPORT_ID = R.REPORT_ID
						AND PI.PROPERTY_TYPE = 'Shop'
				)
			)
			ORDER BY
				R.SUBMISSION_DATE DESC
		) FILTER (
			WHERE
				R.REPORT_ID IS NOT NULL
		),
		'[]'::JSONB
	) AS ALL_REPORTS
FROM
	USERS U
	LEFT JOIN REPORTS R ON U.USER_ID = R.U_ID
	LEFT JOIN DISASTERS D ON R.D_ID = D.D_ID
WHERE
	U.USER_ID = $1
GROUP BY
	U.USER_ID,
	U.PHONE_NUMBER;`
	try {
		const response = await query(fetchingQuery, [user.user_id]) // hardcoded we need to fix it once it complets the trials
		res.status(200).json(response.rows[0])
	} catch (error) {
		console.log(error);

		return next(errorGenerator('Something went wrong while fetching the reports'))
	}
}
module.exports = { getAllPostedReports }