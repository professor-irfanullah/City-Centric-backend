require('dotenv').config()
const express = require('express')
const authRoutes = require('./routes/auth.js')
const reportsRoute = require('./routes/affectedRoute')
const errorHandler = require('./middlewware/errorHandler.js')
const notFoundHandler = require('./middlewware/notFoundHandler.js')
const cors = require('cors')
const cookies = require('cookie-parser')
const helmet = require('helmet')
const app = express()
app.set('trust proxy', 1)
app.use(helmet({
    contentSecurityPolicy: false
}))
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS).split(',')
app.use(cors({
    origin: function (origin, callback) {
        console.log("Incoming Request Origin:", origin);
        // Allow requests with no origin (like mobile apps or curl)
        // if (!origin) return callback(null, true);

        // if (allowedOrigins.includes(origin)) {
        //     callback(null, true);
        // } else {
        //     console.log(`The origin ${origin} is blocked by CORS`);
        //     callback(new Error('Not allowed by CORS'));
        // }

        // origin is undefined when requested server-side (Nuxt SSR)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }

    },
    credentials: true,
    optionsSuccessStatus: 200
}));
// app.options('/*splat', cors())
// app.options('.*', cors())

app.use(cookies())
app.use(express.json())
app.use('/api/auth', authRoutes)
app.use('/api/user', reportsRoute)
app.use('/api/admin', require('./routes/adminRoutes.js'))
// middlewares
app.use(notFoundHandler)
app.use(errorHandler)
module.exports = app 