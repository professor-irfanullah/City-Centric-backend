const { query, pool } = require('../config/db')
const { sendVerificationEmail } = require('../services/email')
const { errorGenerator } = require('../utils/errorGenarator')
const { hashPassword } = require('../utils/hashing')
const { createAToken } = require('../utils/tokens')
const registerUser = async (req, res, next) => {
    const client = await pool.connect()
    const registerQuery = `insert into users(name,father_name,email,cnic,phone_number,muhalla,village,tehsil,district,password_hash)
    values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`
    const { name, father_name, email, cnic, contact, muhalla, village, tehsil, district, password } = req.body

    if (!name) {
        return next(errorGenerator('Name is required', 400))
    }
    if (!father_name) {
        return next(errorGenerator('Father name is required', 400))
    }
    if (!email) {
        return next(errorGenerator('Email is required', 400))
    }
    if (!cnic) {
        return next(errorGenerator('CNIC is required', 400))
    }
    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]+$/.test(email)) {
        return next(errorGenerator('Invalid Email address', 400))
    }
    if (!contact || contact.trim().length !== 11) {
        return next(errorGenerator('Please provide a valid 11 digits contact number', 400))
    }
    if (!muhalla) {
        return next(errorGenerator('Muhalla is required', 400))
    }
    if (!village) {
        return next(errorGenerator('Village is required', 400))
    }
    if (!tehsil) {
        return next(errorGenerator('Tehsil is required', 400))
    }
    if (!district) {
        return next(errorGenerator('District is required', 400))
    }
    if (!password) {
        return next(errorGenerator('Password is required', 400))
    }

    try {
        const token = createAToken({ name, email, cnic })
        const verification_link = `${req.protocol}://${req.get('host')}/api/auth/verify?token=${token}`
        const hashed_password = await hashPassword(password)
        await client.query('BEGIN')
        await pool.query(registerQuery, [name, father_name, email, cnic, contact, muhalla, village, tehsil, district, hashed_password])
        // Call Brevo service
        const payload = { email, name, verification_link }
        await sendVerificationEmail(payload);
        await client.query('commit')
        res.status(201).json({ msg: "Account created successfully. Please verify your account via the link sent to your email address." })
    }
    catch (error) {
        await client.query('Rollback')
        if (error.constraint === 'cnic_format_check') {
            return next(errorGenerator('Invalid CNIC format', 400))
        }
        if (error.constraint === 'users_email_key') {
            return next(errorGenerator('Error Duplicate Entry', 403))
        }
        if (error.constraint === 'users_cnic_key') {
            return next(errorGenerator('Error Duplicate Entry', 403))
        }
        console.log(error);
        next(errorGenerator('Something went wrong Please try again later', error.statusCode))
    }
    finally {
        client.release()
    }
}
module.exports = { registerUser }