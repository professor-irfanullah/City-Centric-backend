const { query } = require("../config/db")
const { errorGenerator } = require("../utils/errorGenarator")
const { verifyToken } = require('../utils/tokens')
const regitrationVerification = async (req, res, next) => {
    const { token } = req.query

    if (!token) {
        return next(errorGenerator('Token not found', 404))
    }

    try {
        const isValidToken = verifyToken(token)
        await query('update users set is_verified = $1 where email = $2', [true, isValidToken.email])
        res.status(200).json({ msg: 'Verification was successfull, you can now log in to the system' })
    } catch (error) {
        if (error.message === 'jwt expired') {
            return next(errorGenerator('Token Expired', 400))
        }
        if (error.message === 'invalid signature') {
            return next(errorGenerator('Token Tempered'))
        }
        console.log(error);
        return next(errorGenerator(error.message))
    }
}
module.exports = { regitrationVerification }