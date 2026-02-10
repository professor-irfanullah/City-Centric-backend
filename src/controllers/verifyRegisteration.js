const { query } = require("../config/db");
const { errorGenerator } = require("../utils/errorGenarator");
const { verifyHash } = require("../utils/hashing");
const { verifyToken } = require('../utils/tokens');

const regitrationVerification = async (req, res, next) => {
    const { password, token } = req.body;

    if (!token || !password) {
        return next(errorGenerator('Token and password are required', 400));
    }

    try {
        const decoded = verifyToken(token);

        // Fetch user data
        const { rows } = await query(
            'SELECT password_hash, is_verified FROM users WHERE email = $1',
            [decoded.email]
        );

        if (rows.length === 0) {
            return next(errorGenerator('User not found', 404));
        }

        const user = rows[0];

        // Check if already verified to prevent redundant work
        if (user.is_verified) {
            return res.status(200).json({ msg: 'Account already verified. Please log in.' });
        }

        // Verify Password
        const isPasswordMatch = await verifyHash(password, user.password_hash);
        if (!isPasswordMatch) {
            return next(errorGenerator('Invalid credentials', 400));
        }

        // Finalize Verification
        await query('UPDATE users SET is_verified = true WHERE email = $1', [decoded.email]);

        return res.status(200).json({
            msg: 'Verification successful! You can now log in.'
        });

    } catch (error) {
        // Specific JWT error handling via jsonwebtoken docs logic
        console.log(error);

        const msg = error.name === 'TokenExpiredError' ? 'Token Expired' :
            error.name === 'JsonWebTokenError' ? 'Invalid Token' :
                'Internal Server Error';

        return next(errorGenerator(msg, 400));
    }
};

module.exports = { regitrationVerification };
