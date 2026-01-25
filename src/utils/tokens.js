require('dotenv').config()
const jwt = require('jsonwebtoken')

const createAToken = (payload, expiring_at = '1h') => {
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: expiring_at,
        algorithm: process.env.JWT_ALGORITHM
    })
    return token
}

const verifyToken = (token) => {
    const isValid = jwt.verify(token, process.env.JWT_SECRET)
    return isValid
}
module.exports = { createAToken, verifyToken }