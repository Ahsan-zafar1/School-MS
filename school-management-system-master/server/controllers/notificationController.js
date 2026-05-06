const Fee = require('../models/Fee');
const Notification = require('../models/Notification');
const { sendFeeReminder, sendAdminFeeSummary } = require('../utils/emailService');

const sendPendingFeeNotifications = async (req, res) => {
  try {
    // Get all pending fees for the current month
    const currentDate = new Date();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const pendingFees = await Fee.find({
      status: 'pending',
      dueDate: {
        $gte: firstDayOfMonth,
        $lte: lastDayOfMonth
      }
    }).populate('studentId', 'name email');

    if (pendingFees.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No pending fees found for the current month'
      });
    }

    // Format fees for notification
    const formattedFees = pendingFees.map(fee => ({
      studentId: fee.studentId._id,
      studentName: fee.studentId.name,
      studentEmail: fee.studentId.email,
      amount: fee.amount,
      dueDate: fee.dueDate
    }));

    // Send notifications to students
    const results = {
      success: [],
      failed: []
    };

    for (const fee of formattedFees) {
      try {
        const result = await sendFeeReminder({
          name: fee.studentName,
          email: fee.studentEmail,
          amount: fee.amount,
          dueDate: fee.dueDate
        });

        if (result.success) {
          results.success.push(fee);
        } else {
          results.failed.push({ ...fee, error: result.message });
        }
      } catch (error) {
        results.failed.push({ ...fee, error: error.message });
      }
    }

    // Send summary to admin
    const adminResult = await sendAdminFeeSummary(formattedFees);

    res.status(200).json({
      success: true,
      message: 'Fee notifications sent',
      results: {
        totalProcessed: formattedFees.length,
        successful: results.success.length,
        failed: results.failed.length,
        adminNotification: adminResult,
        details: results
      }
    });
  } catch (error) {
    console.error('Error sending fee notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send fee notifications',
      error: error.message
    });
  }
};

// --- In-app notifications (Notification model) ---

const listMyNotifications = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const unreadOnly = req.query.unread === 'true' || req.query.unread === '1';
    const query = { user: req.user._id };
    if (unreadOnly) query.read = false;
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.status(200).json({
      success: true,
      data: notifications,
      count: notifications.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
};

const createNotification = async (req, res) => {
  try {
    const { title, message, user: userId } = req.body;
    if (!title || !message || !userId) {
      return res.status(400).json({
        success: false,
        message: 'title, message, and user are required'
      });
    }
    const doc = await Notification.create({
      title,
      message,
      user: userId,
      read: false
    });
    res.status(201).json({
      success: true,
      data: doc.toObject ? doc.toObject() : doc
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create notification',
      error: error.message
    });
  }
};

const createNotificationsForUsers = async (req, res) => {
  try {
    const { title, message, userIds } = req.body;
    if (!title || !message || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'title, message, and userIds (array) are required'
      });
    }
    const docs = await Notification.insertMany(
      userIds.map(uid => ({ title, message, user: uid, read: false }))
    );
    res.status(201).json({
      success: true,
      data: docs,
      count: docs.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create notifications',
      error: error.message
    });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user._id
    });
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    notification.read = true;
    await notification.save();
    res.status(200).json({
      success: true,
      data: notification.toObject ? notification.toObject() : notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update notification',
      error: error.message
    });
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { user: req.user._id, read: false },
      { $set: { read: true } }
    );
    res.status(200).json({
      success: true,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to mark notifications as read',
      error: error.message
    });
  }
};

module.exports = {
  sendPendingFeeNotifications,
  listMyNotifications,
  createNotification,
  createNotificationsForUsers,
  markNotificationRead,
  markAllNotificationsRead
}; 