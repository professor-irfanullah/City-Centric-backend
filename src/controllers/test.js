const { query } = require('../config/db.js')
const test = async (req, res, next) => {
    try {
        const result = await query('SELECT NOW() AS currentTime');
        console.log('Auth Router DB Test Success:', result.rows[0].currenttime);
        res.status(200).json({
            module: 'Auth Router',
            status: 'Success',
            message: 'Database connection via auth route successful.',
            databaseTime: result.rows[0].currenttime
        });
    } catch (error) {
        console.error('Auth Router DB Test Failed:', error.stack);
        res.status(500).json({
            module: 'Auth Router',
            status: 'Error',
            message: 'Database connection failed in auth route.',
            error: error.message
        });
    }
}
module.exports = { test }