const { query } = require("../../config/db");
const { errorGenerator } = require("../../utils/errorGenarator");

const fetchAdminAnalytics = async (req, res, next) => {
	const fetchingQuery = /*`
SELECT
	-- Global & Swat Metrics
	COUNT(DISTINCT REPORT_ID) AS TOTAL_REPORTS,
	COALESCE(
		ROUND(
			AVG(
				CASE
					WHEN REPORT_STATUS IN ('verified', 'rejected') THEN 100.0
					ELSE 0
				END
			),
			1
		),
		0
	) AS PERCENT_PROCESSED,
	count(*) filter(where dr.report_status = 'verified') as total_verified,
    COUNT(*) FILTER (WHERE DR.REPORT_STATUS = 'pending') AS TOTAL_PENDING,
	COUNT(*) FILTER (
		WHERE
			LOWER(U.DISTRICT) = 'swat'
	) AS SWAT_TOTAL_REPORTS,
	COALESCE(
		SUM(DEATHS_COUNT) FILTER (
			WHERE
				LOWER(U.DISTRICT) = 'swat'
		),
		0
	) AS TOTAL_HUMAN_DEATHS_SWAT,
	-- WORST AFFECTED: Now calculated using a Weighted Score
	(
		SELECT
			INITCAP(U_SUB.TEHSIL)
		FROM
			DISASTER_REPORT DR_SUB
			LEFT JOIN USERS U_SUB ON U_SUB.USER_ID = DR_SUB.REPORTER_ID
		WHERE
			LOWER(U_SUB.DISTRICT) = 'swat'
		GROUP BY
			INITCAP(U_SUB.TEHSIL)
		ORDER BY
			(
				(SUM(DEATHS_COUNT) * 10) + -- Human life (High Weight)
				(SUM(INJURED_COUNT) * 5) + -- Injury
				(
					COUNT(*) FILTER (
						WHERE
							HOME_DAMAGE_LEVEL = 'fully_destroyed'
					) * 5
				) + -- Destroyed Homes
				(
					COUNT(*) FILTER (
						WHERE
							SHOP_DAMAGE_LEVEL = 'fully_destroyed'
					) * 3
				) + -- Destroyed Shops
				(COUNT(*) * 1) -- Report Volume
			) DESC
		LIMIT
			1
	) AS WORST_AFFECTED_TEHSIL,
	-- THE ITERABLE: Tehsil Breakdown
	COALESCE(
		(
			SELECT
				JSONB_AGG(
					TEHSIL_STATS
					ORDER BY
						TEHSIL_STATS.WEIGHTED_IMPACT DESC
				)
			FROM
				(
					SELECT
						INITCAP(U_SUB.TEHSIL) AS TEHSIL_NAME,
						COUNT(*) AS TOTAL_REPORTS,
						COALESCE(SUM(DEATHS_COUNT), 0) AS HUMAN_DEATHS,
						COALESCE(SUM(INJURED_COUNT), 0) AS HUMAN_INJURIES,
						-- Ranking Weight for the Array Sorting
						(
							(COALESCE(SUM(DEATHS_COUNT), 0) * 10) + (
								COUNT(*) FILTER (
									WHERE
										HOME_DAMAGE_LEVEL = 'fully_destroyed'
								) * 5
							) + (COALESCE(SUM(INJURED_COUNT), 0) * 3) + (COUNT(*) * 1)
						) AS WEIGHTED_IMPACT,
						-- Damage Detail Fields
						COUNT(*) FILTER (
							WHERE
								IS_HOME_IMPACTED
						) AS HOMES_AFFECTED,
						COUNT(*) FILTER (
							WHERE
								IS_HOME_IMPACTED
								AND HOME_DAMAGE_LEVEL = 'fully_destroyed'
						) AS FULLY_HOMES_DESTROYED,
						COUNT(*) FILTER (
							WHERE
								IS_SHOP_IMPACTED
						) AS SHOPS_AFFECTED,
						COALESCE(
							SUM(
								SMALL_ANIMALS_DEATH_COUNT + BIG_ANIMALS_DEATH_COUNT
							),
							0
						) AS ANIMALS_DEATHS
					FROM
						DISASTER_REPORT DR_SUB
						LEFT JOIN USERS U_SUB ON U_SUB.USER_ID = DR_SUB.REPORTER_ID
					WHERE
						LOWER(U_SUB.DISTRICT) = 'swat'
					GROUP BY
						INITCAP(U_SUB.TEHSIL)
				) TEHSIL_STATS
		),
		'[]'::JSONB
	) AS TEHSIL_BREAKDOWN
FROM
	DISASTER_REPORT DR
	LEFT JOIN USERS U ON U.USER_ID = DR.REPORTER_ID;
   `*/`WITH TEHSIL_LEVEL_DATA AS (
    SELECT
        INITCAP(U.DISTRICT) AS DISTRICT_NAME,
        INITCAP(U.TEHSIL) AS TEHSIL_NAME,
        COUNT(*) AS TOTAL_REPORTS,
        
        -- Updated Disaster Type Counts (Including Earthquake)
        COUNT(*) FILTER (WHERE DR.DISASTER_TYPE = 'flood') AS FLOOD_REPORTS,
        COUNT(*) FILTER (WHERE DR.DISASTER_TYPE = 'land_slide') AS LANDSLIDE_REPORTS,
        COUNT(*) FILTER (WHERE DR.DISASTER_TYPE = 'earthquake') AS EARTHQUAKE_REPORTS,
        COUNT(*) FILTER (WHERE DR.DISASTER_TYPE = 'fire') AS FIRE_REPORTS,
        COUNT(*) FILTER (WHERE DR.DISASTER_TYPE NOT IN ('flood', 'land_slide', 'earthquake', 'fire')) AS OTHER_REPORTS,

        -- Human Stats
        COALESCE(SUM(DEATHS_COUNT), 0) AS HUMAN_DEATHS,
        COALESCE(SUM(INJURED_COUNT), 0) AS HUMAN_INJURIES,
        COALESCE(SUM(TOTAL_RESIDENTS_COUNT), 0) AS RESIDENTS,
        COALESCE(SUM(PREGNANT_WOMEN_COUNT), 0) AS PREGNANT_WOMEN,
        COALESCE(SUM(SCHOOL_GOING_CHILDREN_COUNT), 0) AS SCHOOL_CHILDREN,
        COALESCE(SUM(MARRIED_COUPLES_COUNT), 0) AS MARRIED_COUPLES,

        -- Impact Weighting (Earthquakes/Floods usually drive the highest scores)
        (
            (COALESCE(SUM(DEATHS_COUNT), 0) * 10) + 
            (COUNT(*) FILTER (WHERE HOME_DAMAGE_LEVEL = 'fully_destroyed') * 5) + 
            (COALESCE(SUM(INJURED_COUNT), 0) * 3) + 
            (COUNT(*) * 1)
        ) AS WEIGHTED_IMPACT,

        -- Infrastructure
        COUNT(*) FILTER (WHERE IS_HOME_IMPACTED) AS HOMES_AFFECTED,
        COUNT(*) FILTER (WHERE HOME_DAMAGE_LEVEL = 'minor') AS HOMES_MINOR,
        COUNT(*) FILTER (WHERE HOME_DAMAGE_LEVEL = 'major') AS HOMES_MAJOR,
        COUNT(*) FILTER (WHERE HOME_DAMAGE_LEVEL = 'fully_destroyed') AS HOMES_FULLY,
        COUNT(*) FILTER (WHERE IS_SHOP_IMPACTED) AS SHOPS_AFFECTED,
        COUNT(*) FILTER (WHERE SHOP_DAMAGE_LEVEL = 'minor') AS SHOPS_MINOR,
        COUNT(*) FILTER (WHERE SHOP_DAMAGE_LEVEL = 'major') AS SHOPS_MAJOR,
        COUNT(*) FILTER (WHERE SHOP_DAMAGE_LEVEL = 'fully_destroyed') AS SHOPS_FULLY,

        -- Animals
        COALESCE(SUM(SMALL_ANIMALS_DEATH_COUNT), 0) AS SMALL_DEATHS,
        COALESCE(SUM(BIG_ANIMALS_DEATH_COUNT), 0) AS BIG_DEATHS,
        COALESCE(SUM(SMALL_ANIMALS_INJURED_COUNT), 0) AS SMALL_INJURIES,
        COALESCE(SUM(BIG_ANIMALS_INJURED_COUNT), 0) AS BIG_INJURIES
        
    FROM DISASTER_REPORT DR
    LEFT JOIN USERS U ON U.USER_ID = DR.REPORTER_ID
    GROUP BY INITCAP(U.DISTRICT), INITCAP(U.TEHSIL)
)
SELECT
    -- GLOBAL OVERVIEW
    SUM(SUM(TOTAL_REPORTS)) OVER() AS GLOBAL_TOTAL_REPORTS,
    SUM(SUM(HUMAN_DEATHS)) OVER() AS GLOBAL_TOTAL_DEATHS,

    -- DISTRICT LEVEL STRATEGY
    DISTRICT_NAME,
    SUM(TOTAL_REPORTS) AS DISTRICT_TOTAL_REPORTS,
    SUM(WEIGHTED_IMPACT) AS DISTRICT_WEIGHTED_IMPACT,
    
    -- Updated Disaster Distribution (%)
    ROUND(SUM(FLOOD_REPORTS) * 100.0 / NULLIF(SUM(TOTAL_REPORTS), 0), 1) AS PCT_FLOODS,
    ROUND(SUM(LANDSLIDE_REPORTS) * 100.0 / NULLIF(SUM(TOTAL_REPORTS), 0), 1) AS PCT_LANDSLIDES,
    ROUND(SUM(EARTHQUAKE_REPORTS) * 100.0 / NULLIF(SUM(TOTAL_REPORTS), 0), 1) AS PCT_EARTHQUAKES,
    ROUND(SUM(FIRE_REPORTS) * 100.0 / NULLIF(SUM(TOTAL_REPORTS), 0), 1) AS PCT_FIRES,

    -- Human & Demographic Totals
    SUM(HUMAN_DEATHS) AS DISTRICT_TOTAL_DEATHS,
    SUM(HUMAN_INJURIES) AS DISTRICT_TOTAL_INJURIES,
    SUM(RESIDENTS) AS DISTRICT_TOTAL_RESIDENTS,
    SUM(PREGNANT_WOMEN) AS DISTRICT_TOTAL_PREGNANT,
    SUM(SCHOOL_CHILDREN) AS DISTRICT_TOTAL_SCHOOL_KIDS,
    
    -- Animal Totals
    SUM(SMALL_DEATHS + BIG_DEATHS) AS DISTRICT_TOTAL_ANIMAL_DEATHS,
    SUM(SMALL_INJURIES + BIG_INJURIES) AS DISTRICT_TOTAL_ANIMAL_INJURIES,

    -- REDEFINED TEHSIL BREAKDOWN (Flat & Complete)
    JSONB_AGG(
        JSONB_BUILD_OBJECT(
            'tehsil_name', TEHSIL_NAME,
            'district_name', DISTRICT_NAME,
            'total_reports', TOTAL_REPORTS,
            -- Detailed Disaster Mix
            'disaster_mix', JSONB_BUILD_OBJECT(
                'floods', FLOOD_REPORTS, 
                'landslides', LANDSLIDE_REPORTS, 
                'earthquakes', EARTHQUAKE_REPORTS, 
                'fires', FIRE_REPORTS,
                'others', OTHER_REPORTS
            ),
            -- Infrastructure
            'homes_impacted', HOMES_AFFECTED,
            'homes_minor', HOMES_MINOR,
            'homes_major', HOMES_MAJOR,
            'homes_fully_destroyed', HOMES_FULLY,
            'shops_impacted', SHOPS_AFFECTED,
            'shops_minor', SHOPS_MINOR,
            'shops_major', SHOPS_MAJOR,
            'shops_fully_destroyed', SHOPS_FULLY,
            -- Animals
            'animal_deaths_total', (SMALL_DEATHS + BIG_DEATHS),
            'animal_deaths_small', SMALL_DEATHS,
            'animal_deaths_big', BIG_DEATHS,
            'animal_injuries_total', (SMALL_INJURIES + BIG_INJURIES),
            'animal_injuries_small', SMALL_INJURIES,
            'animal_injuries_big', BIG_INJURIES,
            -- Human
            'human_deaths', HUMAN_DEATHS,
            'human_injuries', HUMAN_INJURIES
        ) ORDER BY WEIGHTED_IMPACT DESC
    ) AS TEHSIL_BREAKDOWN

FROM TEHSIL_LEVEL_DATA
GROUP BY DISTRICT_NAME
ORDER BY DISTRICT_WEIGHTED_IMPACT DESC;

`
	try {
		const response = await query(fetchingQuery, [])
		res.status(200).json(response.rows)
	} catch (error) {
		return next(errorGenerator('Something went wrong while fetching analytics', 500))
	}
}
module.exports = { fetchAdminAnalytics };