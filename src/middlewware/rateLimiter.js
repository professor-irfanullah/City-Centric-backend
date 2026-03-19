const { rateLimit } = require('express-rate-limit');
const { errorGenerator } = require('../utils/errorGenarator');

// Shared validation settings to stop the Vercel/Proxy errors
const commonOptions = {
    standardHeaders: true,
    legacyHeaders: false,
    validate: {
        xForwardedForHeader: false, // Fixes ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
        forwardedHeader: false      // Fixes ERR_ERL_FORWARDED_HEADER
    },
    handler: (req, res, next, options) => {
        next(errorGenerator(options.message, 429));
    }
};

const loginLimiter = rateLimit({
    ...commonOptions,
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many requests from this IP, please try again later.',
    skipSuccessfulRequests: true,
});

const verificationEmailLimiter = rateLimit({
    ...commonOptions,
    windowMs: 60 * 60 * 1000, // Fixed: changed 100 to 1000 (1 hour)
    max: 3,
    message: 'Too many requests from this IP, please try again later.',
});

const forgotPasswordLimiter = rateLimit({
    ...commonOptions,
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: 'Too many password reset requests from this IP, please try again later.',
});

module.exports = { loginLimiter, verificationEmailLimiter, forgotPasswordLimiter };
