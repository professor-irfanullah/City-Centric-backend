require('dotenv').config()
const bcrypt = require('bcrypt')
const hashPassword = async (plain) => {
    const saltRounds = process.env.SALT_ROUNDS || 10
    const hashed = await bcrypt.hash(plain, parseInt(saltRounds))
    return hashed
}
const verifyHash = async (plain, hashed) => {
    const isValid = await bcrypt.compare(plain, hashed)
    return isValid
}
module.exports = { hashPassword, verifyHash }