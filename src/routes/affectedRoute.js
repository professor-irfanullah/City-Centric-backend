const express = require('express')
const { postReport } = require('../controllers/users/postReport')
const { protectedRoute } = require('../middlewware/verifyTokenMiddleware.js')
const router = express()
router.use(express.json())

router.post('/post/report', protectedRoute, postReport)
module.exports = router