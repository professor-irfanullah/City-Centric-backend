const { errorGenerator } = require("../../utils/errorGenarator");
const crypto = require("crypto");
const { query, pool } = require("../../config/db");
const verifyAdminRole = async (req, res, next) => {
    const checkQuery = `SELECT CNIC, TOKEN_HASH,EXPIRES_AT FROM SUPER_ADMIN_INVITES WHERE CNIC = $1 AND TOKEN_HASH = $2 AND EXPIRES_AT > NOW() AND STATUS = $3 FOR UPDATE`;
    const updateTokenStatusQuery = `UPDATE SUPER_ADMIN_INVITES SET STATUS = 'used', updated_at = NOW() WHERE CNIC = $1;`;
    const updateAdminRoleQuery = `UPDATE USERS SET ROLE = 'admin', updated_at = NOW() WHERE CNIC = $1;`;
    const { token, cnic } = req.body;
    if (!token || !cnic)
        return next(errorGenerator("Token and CNIC are required", 400));

    let client;
    try {
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        client = await pool.connect()
        const response = await client.query(checkQuery, [cnic, tokenHash, "pending"]);
        if (response.rows.length === 0) {
            await client.query('ROLLBACK')
            return next(errorGenerator("Invalid token,CNIC Or the token was expired", 401));
        }
        await client.query('BEGIN')
        await client.query(updateTokenStatusQuery, [cnic]);
        await client.query(updateAdminRoleQuery, [cnic]);
        await client.query('COMMIT');
        res
            .status(200)
            .json({ msg: "Admin role verified and updated successfully" });
    } catch (error) {
        await client.query('ROLLBACK');
        console.log(error);
        next(errorGenerator("Something went wrong while verifying the role"));
    }
    finally {
        if (client) client.release()
    }
};
module.exports = { verifyAdminRole };
