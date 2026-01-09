const express = require('express');
const authorize = require('../middlewware/authorizationMiddleware.js');
const router = express.Router();
const { fetchAllReports } = require('../controllers/admin/fetchAllReports.js');
const { protectedRoute } = require('../middlewware/verifyTokenMiddleware.js');
router.get('/get/reports', protectedRoute, authorize(['admin', 'super_admin']), fetchAllReports);
module.exports = router;