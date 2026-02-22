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
            U.NAME, U.FATHER_NAME, U.EMAIL, U.CNIC, U.PHONE_NUMBER,
            U.MUHALLA, U.VILLAGE, 
            INITCAP(U.TEHSIL) as tehsil,
            INITCAP(U.DISTRICT) as district,
            DR.REPORT_ID, DR.DISASTER_TYPE, DR.LOCATION, DR.CREATED_AT,
            DR.ARE_ANIMALS_IMPACTED,
            COALESCE(DR.BIG_ANIMALS_DEATH_COUNT, 0) as big_animals_death_count,
            COALESCE(DR.BIG_ANIMALS_INJURED_COUNT, 0) as big_animals_injured_count,
            COALESCE(DR.SMALL_ANIMALS_DEATH_COUNT, 0) as small_animals_death_count,
            COALESCE(DR.SMALL_ANIMALS_INJURED_COUNT, 0) as small_animals_injured_count,
            DR.IS_HOME_IMPACTED, DR.HOME_DAMAGE_LEVEL,
            DR.IS_SHOP_IMPACTED, DR.SHOP_DAMAGE_LEVEL,
            COALESCE(DR.TOTAL_RESIDENTS_COUNT, 0) as total_residents_count,
            COALESCE(DR.DEATHS_COUNT, 0) as deaths_count,
            COALESCE(DR.INJURED_COUNT, 0) as injured_count,
            COALESCE(DR.PREGNANT_WOMEN_COUNT, 0) as pregnant_women_count,
            COALESCE(DR.DISABLED_PERSONS_COUNT, 0) as disabled_persons_count,
            COALESCE(DR.SCHOOL_GOING_CHILDREN_COUNT, 0) as school_going_children_count,
            COALESCE(DR.MARRIED_COUPLES_COUNT, 0) as married_couples_count,
            DR.REPORT_STATUS AS verification_status,
            DR.HOME_IMAGE_URL, DR.SHOP_IMAGE_URL
        FROM DISASTER_REPORT DR
        INNER JOIN USERS U ON DR.REPORTER_ID = U.USER_ID
        WHERE DR.REPORT_ID = $1`;

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
