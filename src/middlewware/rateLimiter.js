const { rateLimit } = require('express-rate-limit');
const { errorGenerator } = require('../utils/errorGenarator');
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skipSuccessfulRequests: true,
    handler: (req, res, next, options) => {
        next(errorGenerator(options.message, 429));
    }
})
module.exports = loginLimiter;