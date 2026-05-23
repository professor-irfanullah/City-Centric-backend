const { query, pool } = require("../config/db");
const { errorGenerator } = require("./errorGenarator")

const updateDisasterType = async (req, client) => {
    // we are going to left join the reports table and fetch the disaster type and then we will compare the value if match nothing will happen if not we will change the disaster_type by checking for it in the same table
    const validDisasters = ['Flood', 'Fire', 'Land_slide', 'Earthquake', 'Cyclone']

    if (!req.disasterData) throw (errorGenerator('The disaster payload is missing', 400));

    if (!req.disasterData.disaster_type || !validDisasters.includes(req.disasterData.disaster_type)) throw (errorGenerator('The disaster type is missing or invalid', 400));

    if (!req.disasterData.report_id) throw (errorGenerator('The disaster report_id is missing', 400));


    try {
        const response = await client.query('SELECT DISASTER_TYPE, D_ID FROM DISASTERS WHERE DISASTER_TYPE = $1', [req.disasterData.disaster_type])
        if (response.rowCount <= 0) {
            const response = await client.query('insert into disasters(disaster_type) values($1) returning d_id', [req.disasterData.disaster_type]);
            const updResponse = await client.query('update reports set d_id = $1 where report_id = $2', [response.rows[0].d_id, req.disasterData.report_id])
            req.status.push('Inserted disaster_type')
        }
        else {
            const { disaster_type, d_id } = response.rows[0]
            const dbResponse = await client.query('UPDATE REPORTS SET D_ID = $1 WHERE REPORT_ID = $2', [d_id, req.disasterData.report_id])
            req.status.push('updated the report for the disaster type')
        }
        // return req.status
    } catch (error) {
        if (error.statusCode) throw error;
        console.log(error);
        throw (errorGenerator('Something went wrong while updating the disaster related information', 500))
    }
}
module.exports = { updateDisasterType }