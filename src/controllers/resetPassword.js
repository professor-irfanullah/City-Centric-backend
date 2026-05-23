const { pool } = require("../config/db"); // Use pool for transactions
const { errorGenerator } = require("../utils/errorGenarator")
const crypto = require('crypto');
const { hashPassword } = require("../utils/hashing");

const resetPassword = async (req, res, next) => {
    const { email, token, reset_password } = req.body;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let client;

    if (!email || !emailRegex.test(email)) return next(errorGenerator('Valid email required', 400));
    if (!token) return next(errorGenerator('Invalid Token', 400));
    if (!reset_password || reset_password.length < 8) return next(errorGenerator('Password must be at least 8 characters', 400));

    try {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        client = await pool.connect();

        // 1. Verify token existence and expiry
        const response = await client.query(
            `SELECT fpt.user_id 
             FROM forgot_password_tokens fpt 
             JOIN users u ON u.user_id = fpt.user_id 
             WHERE u.email = $1 AND fpt.token = $2 AND fpt.expires_at > NOW()`,
            [email, tokenHash]
        );

        if (response.rows.length === 0) {
            return next(errorGenerator('Invalid token or link expired', 401));
        }

        const { user_id } = response.rows[0];
        const hashedPassword = await hashPassword(reset_password);

        // 2. Execute Atomic Transaction
        await client.query('BEGIN');

        // Update password
        await client.query(
            'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2',
            [hashedPassword, user_id]
        );

        // Destroy token so it can never be used again
        await client.query(
            'DELETE FROM forgot_password_tokens WHERE user_id = $1',
            [user_id]
        );

        await client.query('COMMIT');

        res.status(200).json({ msg: "Password has been reset successfully. You can now log in." });

    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error("Reset Password Error:", error);
        next(errorGenerator('Internal Server Error', 500));
    } finally {
        if (client) client.release();
    }
};

module.exports = { resetPassword }
