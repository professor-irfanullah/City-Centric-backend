const { errorGenerator } = require('../utils/errorGenarator')
const { verifyToken } = require('../utils/tokens')
const protectedRoute = async (req, res, next) => {
    const token = req.cookies.session_token
    if (!token) {
        return next(errorGenerator('Token not Found please log in', 401))
    }
    try {

        const isVerified = verifyToken(token)

        req.user = isVerified
        next()
    } catch (error) {
        if (error.message === 'invalid token') {
            return next(errorGenerator('Invalid Token', 400))
        }
        if (error.message === 'jwt expired') {
            return next(errorGenerator('Token Expired', 400))
        }
        console.log('error');
        return next(errorGenerator('Something went wrong while verification of tokens'))
    }
}
module.exports = { protectedRoute }