const express = require('express');
const router = express.Router();
const { sendPendingFeeNotifications } = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/auth');

// Send notifications for pending fees (admin only)
router.post('/send-pending-fees', protect, authorize('admin'), sendPendingFeeNotifications);

module.exports = router; 