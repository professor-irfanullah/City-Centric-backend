// middleware/errorHandler.js (No changes needed)

const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    console.error('--- Global Error Caught ---');
    console.error(err.stack);

    res.status(statusCode).json({
        status: 'error',
        statusCode: statusCode,
        message: message,
    });
};

module.exports = errorHandler;
