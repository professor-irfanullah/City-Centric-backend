const { errorGenerator } = require('../../utils/errorGenarator.js')
const { query } = require('../../config/db')
const fetchAllReports = async (req, res, next) => {
	const insertionQuery = `SELECT
	U.NAME,
	U.FATHER_NAME,
	U.EMAIL,
	U.CNIC,
	U.PHONE_NUMBER,
	U.MUHALLA,
	U.VILLAGE,
	U.TEHSIL,
	U.DISTRICT,
	DR.DISASTER_TYPE,
	DR.LOCATION,
	DR.CREATED_AT,
	DR.ARE_ANIMALS_IMPACTED,
	DR.BIG_ANIMALS_DEATH_COUNT,
	DR.BIG_ANIMALS_INJURED_COUNT,
	DR.SMALL_ANIMALS_DEATH_COUNT,
	DR.SMALL_ANIMALS_INJURED_COUNT,
	DR.IS_HOME_IMPACTED,
	DR.HOME_DAMAGE_LEVEL,
	DR.IS_SHOP_IMPACTED,
	DR.SHOP_DAMAGE_LEVEL,
	DR.TOTAL_RESIDENTS_COUNT,
	DR.DEATHS_COUNT,
	DR.INJURED_COUNT,
	DR.PREGNANT_WOMEN_COUNT,
	DR.DISABLED_PERSONS_COUNT,
	DR.SCHOOL_GOING_CHILDREN_COUNT,
	DR.MARRIED_COUPLEs_COUNT,
	DR.REPORT_STATUS,
	DR.HOME_IMAGE_URL,
	DR.SHOP_IMAGE_URL,
	DR.REPORT_STATUS
	FROM DISASTER_REPORT DR
	LEFT JOIN USERS U ON DR.REPORTER_ID = U.USER_ID`;
	try {
		const response = await query(insertionQuery, [])
		res.status(200).json({ reports: response.rows })
	} catch (error) {
		console.log(error.message);

		return next(errorGenerator('Internal Server Error', 500))
	}
}
module.exports = { fetchAllReports };