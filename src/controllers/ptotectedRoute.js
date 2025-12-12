const protectedRouteHandler = async (req, res, next) => {
    res.send(req.user)
}
module.exports = { protectedRouteHandler }
