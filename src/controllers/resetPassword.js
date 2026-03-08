const { query } = require("../config/db");
const { errorGenerator } = require("../utils/errorGenarator")
const crypto = require('crypto');
const { hashPassword } = require("../utils/hashing");

const resetPassword = async (req, res, next) => {
    const { email, token, reset_password } = req.body;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || !emailRegex.test(email)) return next(errorGenerator('Valid email required', 400));
    if (!token) return next(errorGenerator('Invalid Token', 400));
    if (!reset_password || reset_password.length < 8) return next(errorGenerator('Password must be at least 8 characters', 400));

    try {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        //  Verify token
        const response = await query(
            'SELECT fpt.user_id FROM forgot_password_tokens fpt JOIN users u ON u.user_id = fpt.user_id WHERE u.email = $1 AND fpt.token = $2 AND fpt.expires_at > NOW()',
            [email, tokenHash]
        );

        if (response.rows.length === 0) return next(errorGenerator('Invalid token or expired', 404));

        const { user_id } = response.rows[0];

        //  Hash new password (added await)
        const hashedPassword = await hashPassword(reset_password);

        //  Update password AND delete token (Security: prevent reuse)
        await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2', [hashedPassword, user_id]);
        await query('DELETE FROM forgot_password_tokens WHERE user_id = $1', [user_id]);

        res.status(200).json({ msg: "Password reset successful" });
    } catch (error) {
        console.error(error);
        next(errorGenerator('Internal Server Error'));
    }
};

module.exports = { resetPassword }