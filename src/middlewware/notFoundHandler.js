const notFoundHandler = (req, res, next) => {

    const error = new Error(`Route Not Found - ${req.originalUrl}`);
    error.status = 404;
    next(error);
};

module.exports = notFoundHandler;
