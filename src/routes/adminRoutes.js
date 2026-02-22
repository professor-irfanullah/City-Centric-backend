const express = require('express');
const authorize = require('../middlewware/authorizationMiddleware.js');
const router = express.Router();
const { fetchAllReports } = require('../controllers/admin/fetchAllReports.js');
const { protectedRoute } = require('../middlewware/verifyTokenMiddleware.js');
const { inviteAdmin } = require('../controllers/admin/inviteAdmin.js');
const { verifyAdminRole } = require('../controllers/admin/verifyAdminRole.js');
const { generatePdf } = require('../controllers/admin/generatePdf.js');
const { fetchAdminAnalytics } = require('../controllers/admin/fetchAdminAnalytics.js');
const { fetchReport } = require('../controllers/admin/fetchSingleReport')

router.get('/get/report', protectedRoute, authorize(['admin', 'super_admin']), fetchReport);
router.get('/get/reports', protectedRoute, authorize(['admin', 'super_admin']), fetchAllReports);
router.get('/get/analytics', protectedRoute, authorize(['admin', 'super_admin']), fetchAdminAnalytics);
router.get('/download-pdf', protectedRoute, authorize(['admin', 'super_admin']), generatePdf);



router.post('/invite/admin', protectedRoute, authorize(['admin']), inviteAdmin);
router.post('/verify/admin-role', verifyAdminRole);
module.exports = router;