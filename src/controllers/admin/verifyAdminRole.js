const { errorGenerator } = require("../../utils/errorGenarator");
const crypto = require("crypto");
const { pool } = require("../../config/db");

const verifyAdminRole = async (req, res, next) => {
    const { token, cnic } = req.body;

    if (!token || !cnic) {
        return next(errorGenerator("Token and CNIC are required", 400));
    }

    const checkQuery = `
        SELECT id FROM SUPER_ADMIN_INVITES 
        WHERE CNIC = $1 AND TOKEN_HASH = $2 AND EXPIRES_AT > NOW() AND STATUS = $3 
        FOR UPDATE`;

    const updateTokenStatusQuery = `UPDATE SUPER_ADMIN_INVITES SET STATUS = 'used', updated_at = NOW() WHERE CNIC = $1;`;
    const updateAdminRoleQuery = `UPDATE USERS SET ROLE = 'admin', updated_at = NOW() WHERE CNIC = $1;`;

    let client;
    try {
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

        client = await pool.connect();

        // 1. MUST start the transaction first
        await client.query('BEGIN');

        // 2. Lock the row and verify existence in one go
        const response = await client.query(checkQuery, [cnic, tokenHash, "pending"]);

        if (response.rows.length === 0) {
            // Token is wrong, expired, or cnic mismatch
            await client.query('ROLLBACK');
            return next(errorGenerator("Invalid token, CNIC, or the invitation has expired", 401));
        }

        // 3. Perform Updates
        await client.query(updateTokenStatusQuery, [cnic]);
        await client.query(updateAdminRoleQuery, [cnic]);

        // 4. Commit everything
        await client.query('COMMIT');

        return res.status(200).json({
            msg: "Admin role verified and updated successfully"
        });

    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error("Verification Error:", error);
        return next(errorGenerator("Something went wrong while verifying the role", 500));
    } finally {
        if (client) client.release();
    }
};

module.exports = { verifyAdminRole };
