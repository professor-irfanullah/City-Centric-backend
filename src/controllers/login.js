require('dotenv').config()
const { query } = require("../config/db")
const { errorGenerator } = require("../utils/errorGenarator")
const { verifyHash } = require("../utils/hashing")
const { createAToken } = require("../utils/tokens")

const login = async (req, res, next) => {
    const { email, password } = req.body
    if (!email) {
        return next(errorGenerator('Email is required..', 401))
    }
    if (!password) {
        return next(errorGenerator('Password is required..', 401))
    }
    try {
        const response = await query('select user_id, name, cnic,role,password_hash from users where email = $1 and is_verified = $2', [email, true])
        if (response.rows.length === 0) {
            return next(errorGenerator('User not found', 404))
        }
        const data = response.rows[0]
        const isTrue = await verifyHash(password, data.password_hash)
        if (!isTrue) {
            return next(errorGenerator('Invalid Credientials', 400))
        }
        // now we need to create token and send it as cookies to the browser
        const payload = {
            user_id: data.user_id,
            name: data.name,
            cnic: data.cnic,
            role: data.role
        }
        const token = createAToken(payload)
        res.cookie('session_token', token, {
            sameSite: process.env.SAME_SITE,
            httpOnly: true,
            maxAge: Number(process.env.MAX_AGE), // Ensure this is a number
            secure: process.env.SECURE === 'true'
        })
        res.status(200).json({ msg: "Please wait while we log you in", user: { name: data.name, role: data.role } })
    } catch (error) {
        console.log(error);

        return next(errorGenerator('Something went wrong while login in'))
    }
}
module.exports = { login }