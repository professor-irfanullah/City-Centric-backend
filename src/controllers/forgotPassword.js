const { errorGenerator } = require('../utils/errorGenarator')
const { pool } = require('../config/db')
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../services/email');

const forgotPassword = async (req, res, next) => {
    const { email } = req.body;
    let client;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!email || !emailRegex.test(email)) {
    return next(errorGenerator('Please provide a valid email address', 400));
}

    try {
        client = await pool.connect();

        // 1. Find user
        const userRes = await client.query('SELECT user_id FROM USERS WHERE EMAIL = $1', [email]);
        
        // Security: Return early if user doesn't exist
        if (userRes.rows.length === 0) {
            return res.status(200).json({ msg: "If the email is registered, you will receive a reset link." });
        }

        const userId = userRes.rows[0].user_id;

        // 2. Start Transaction
        await client.query('BEGIN');

        // 3. CHECK: Is there a valid (non-expired) token already?
        const activeToken = await client.query(
            'SELECT id FROM forgot_password_tokens WHERE user_id = $1 AND expires_at > NOW()',
            [userId]
        );

        if (activeToken.rows.length > 0) {
            await client.query('ROLLBACK'); // Release lock before returning
            throw next(errorGenerator('A password reset link has already been sent. Please check your inbox or try again later.', 400));
        }

        // 4. Generate Token logic
        const token = crypto.randomBytes(64).toString('hex');
        const hashToken = crypto.createHash('sha256').update(token).digest('hex');
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); 

        // 5. UPSERT Token
        await client.query(`
            INSERT INTO forgot_password_tokens (user_id, token, expires_at, created_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                token = EXCLUDED.token, 
                expires_at = EXCLUDED.expires_at,
                created_at = NOW();
        `, [userId, hashToken, expiresAt]);

        // 6. Send Email
        const emailObj = {
            email: email,
            reset_link: `${process.env.FRONTEND_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}`
        };
        
        await sendPasswordResetEmail(emailObj);

        // 7. Commit Transaction
        await client.query('COMMIT');

        res.status(200).json({ msg: "If the email is registered, you will receive a reset link." });

    } catch (error) {
        if (client) await client.query('ROLLBACK'); // Undo DB changes if email or query fails
        console.error("Forgot Password Error:", error);
        return next(errorGenerator('Something went wrong while sending the reset link.'));
    } finally {
        if (client) client.release();
    }
};

module.exports = { forgotPassword };
