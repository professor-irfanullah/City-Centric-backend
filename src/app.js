const express = require('express')
const authRoutes = require('./routes/auth.js')
const reportsRoute = require('./routes/affectedRoute')
const errorHandler = require('./middlewware/errorHnadler.js')
const notFoundHandler = require('./middlewware/notFoundHandler.js')
const cors = require('cors')
const cookies = require('cookie-parser')

const app = express()
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS).split(',')
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log(`The origin ${origin} : is blocked by CORS`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(cookies())
app.use(express.json())
app.use('/api/auth', authRoutes)
app.use('/api/user', reportsRoute)
// middlewares
app.use(errorHandler)
app.use(notFoundHandler)
module.exports = app 