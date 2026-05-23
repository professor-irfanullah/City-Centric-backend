require('dotenv').config()
const { query } = require("../config/db")
const { errorGenerator } = require("../utils/errorGenarator")
const { verifyHash } = require("../utils/hashing")
const { createAToken } = require("../utils/tokens")

const login = async (req, res, next) => {
    const { email, password } = req.body

    if (!email || !password) {
        return next(errorGenerator('Email and password are required', 400))
    }

    try {
        const response = await query(
            'SELECT user_id, name, role, password_hash, is_verified FROM users WHERE email = $1',
            [email]
        )

        if (response.rows.length === 0) {
            return next(errorGenerator('Invalid credentials', 401))
        }

        const data = response.rows[0]

        const isMatch = await verifyHash(password, data.password_hash)
        if (!isMatch) {
            return next(errorGenerator('Invalid credentials', 401))
        }
        if (!data.is_verified) {
            return next(errorGenerator('Please verify your email before logging in', 403))
        }
        const payload = {
            user_id: data.user_id,
            name: data.name,
            role: data.role
        }
        const token = createAToken(payload)
        res.cookie('session_token', token, {
            sameSite: process.env.SAME_SITE || 'Lax',
            httpOnly: true,
            maxAge: Number(process.env.MAX_AGE),
            secure: process.env.SECURE === 'true'
        })

        return res.status(200).json({
            msg: "Login successful",
            user: { name: data.name, role: data.role }
        })

    } catch (error) {
        console.error("Login Error:", error);
        return next(errorGenerator('Internal server error', 500))
    }
}
module.exports = { login }