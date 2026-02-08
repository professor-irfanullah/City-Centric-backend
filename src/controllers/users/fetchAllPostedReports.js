const { query } = require("../../config/db")
const { errorGenerator } = require("../../utils/errorGenarator")

const getAllPostedReports = async (req, res, next) => {
    const user = req.user
    const fetchingQuery = `SELECT 
    u.user_id,
    u.phone_number,
    -- Count a specific report column so "no reports" = 0
    COUNT(dr.report_id) AS total_reports,
    COUNT(dr.report_id) FILTER (WHERE dr.report_status = 'verified') AS total_verified_reports,
    COUNT(dr.report_id) FILTER (WHERE dr.report_status = 'pending') AS total_pending_reports,
    COUNT(dr.report_id) FILTER (WHERE dr.report_status IN ('verified', 'rejected')) AS total_processed_reports,
    -- Ensure an empty JSON array if no reports match
    COALESCE(
        json_agg(dr.*) FILTER (WHERE dr.report_id IS NOT NULL), 
        '[]'::json
    ) AS all_reports
FROM users u
LEFT JOIN disaster_report dr ON u.user_id = dr.reporter_id
WHERE u.user_id = $1
GROUP BY u.user_id, u.phone_number;`

    try {
        const response = await query(fetchingQuery, [user.user_id])
        res.status(200).json(response.rows[0])
    } catch (error) {
        console.log(error);

        return next(errorGenerator('Something went wrong while fetching the reports'))
    }
}
module.exports = { getAllPostedReports }