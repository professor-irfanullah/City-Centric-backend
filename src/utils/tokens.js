require('dotenv').config()
const jwt = require('jsonwebtoken')

const createAToken = (payload) => {
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '1h'
    })
    return token
}

const verifyToken = (token) => {
    const isValid = jwt.verify(token, process.env.JWT_SECRET)
    return isValid
}
module.exports = { createAToken, verifyToken }