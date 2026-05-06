const express = require('express');
const router = express.Router();
const {
  sendPendingFeeNotifications,
  listMyNotifications,
  createNotification,
  createNotificationsForUsers,
  markNotificationRead,
  markAllNotificationsRead
} = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/auth');

// Send notifications for pending fees (admin only) - existing route unchanged
router.post('/send-pending-fees', protect, authorize('admin'), sendPendingFeeNotifications);

// --- In-app notifications (Notification model) ---
// List my notifications (students and teachers; any authenticated user)
router.get('/', protect, listMyNotifications);
// Create one notification for a user (admin only)
router.post('/', protect, authorize('admin'), createNotification);
// Create notifications for multiple users (admin only)
router.post('/bulk', protect, authorize('admin'), createNotificationsForUsers);
// Mark all my notifications as read (must be before /:id/read)
router.patch('/read-all', protect, markAllNotificationsRead);
// Mark one notification as read (owner only)
router.patch('/:id/read', protect, markNotificationRead);

module.exports = router; 