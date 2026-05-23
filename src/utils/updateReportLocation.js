const { query, pool } = require("../config/db");
const { isValidCoordinates } = require("../controllers/users/postReport");
const { errorGenerator } = require("./errorGenarator")

const updateGpsLocation = async (req, client) => {
    if (!req.location) throw (errorGenerator('GPS cooridinates required', 400));
    if (!req.report_id || typeof req.report_id !== 'number') throw (errorGenerator('Report ID is required', 400));
    if (!isValidCoordinates(req.location)) throw (errorGenerator('Invalid Coordinates', 400));

    const parts = req.location.split(/[,\s]+/)
    const lat = parseFloat(parts[0]);
    const longi = parseFloat(parts[1]);
    try {
        // const dbResponse = await client.query('SELECT LATITUDE, LONGITUDE FROM REPORTS WHERE REPORT_ID = $1', [req.report_id])
        // if (dbResponse.rows.length) {
        // const { latitude, longitude } = dbResponse.rows[0]
        const response = await client.query('UPDATE REPORTS SET LONGITUDE = $1 , LATITUDE = $2, UPDATED_AT = NOW() WHERE REPORT_ID = $3', [longi, lat, req.report_id])
        console.log('user lat', lat);
        console.log('user long', longi);

        req.status.push('Updated the report coordinates successfully.')

        // }
    } catch (error) {
        if (error.statusCode) throw error;
        console.log(error);
        throw (errorGenerator('Something went wrong while updating GPS location', 500))
    }
}
module.exports = { updateGpsLocation }