const Fee = require('../models/Fee');
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

module.exports = {
  sendPendingFeeNotifications
}; 