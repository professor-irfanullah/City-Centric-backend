const { query } = require("../../config/db")
const { errorGenerator } = require("../../utils/errorGenarator")

const getAllPostedReports = async (req, res, next) => {
    const user = req.user
    const fetchingQuery = `select * from disaster_report where reporter_id = $1`

    try {
        const response = await query(fetchingQuery, [user.user_id])
        res.status(200).json(response.rows)
    } catch (error) {
        console.log(error);

        return next(errorGenerator('Something went wrong while fetching the reports'))
    }
}
module.exports = { getAllPostedReports }