const { errorGenerator } = require('../utils/errorGenarator')
const authorize = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(errorGenerator('unauthorized', 401))
        }
        if (!allowedRoles.includes(req.user.role)) {
            return next(errorGenerator('Forbidden - Insufficient Permissions', 403))
        }
        next()
    }
}
module.exports = authorize;