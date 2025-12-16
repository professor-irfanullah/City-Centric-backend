const express = require('express')
const multer = require('../middlewware/multerMiddleware.js')
const { postReport } = require('../controllers/users/postReport.js')
const { protectedRoute } = require('../middlewware/verifyTokenMiddleware.js')
const { getAllPostedReports } = require('../controllers/users/fetchAllPostedReports.js')
const router = express.Router()
router.use(express.json())

router.post('/post/report', protectedRoute, multer.fields([
    {
        name: 'home_images', maxCount: 5,
    },
    { name: 'shop_images', maxCount: 5 }
]), postReport)
router.get('/get/reports', protectedRoute, getAllPostedReports)
module.exports = router