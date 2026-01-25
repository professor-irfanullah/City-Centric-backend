const express = require('express');
const authorize = require('../middlewware/authorizationMiddleware.js');
const router = express.Router();
const { fetchAllReports } = require('../controllers/admin/fetchAllReports.js');
const { protectedRoute } = require('../middlewware/verifyTokenMiddleware.js');
const { inviteAdmin } = require('../controllers/admin/inviteAdmin.js');
const { verifyAdminRole } = require('../controllers/admin/verifyAdminRole.js');

router.get('/get/reports', protectedRoute, authorize(['admin', 'super_admin']), fetchAllReports);

router.post('/invite/admin', protectedRoute, authorize(['admin']), inviteAdmin);
router.post('/verify/admin-role', verifyAdminRole);
module.exports = router;