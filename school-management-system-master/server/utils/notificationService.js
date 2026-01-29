const { sendFeeReminder, sendAdminFeeSummary } = require('./emailService');

const sendMonthlyFeeNotifications = async (pendingFees) => {
  const results = {
    success: [],
    failed: [],
    adminNotification: null
  };

  // Send notifications to students
  for (const fee of pendingFees) {
    try {
      const result = await sendFeeReminder({
        name: fee.studentName,
        email: fee.studentEmail,
        amount: fee.amount,
        dueDate: fee.dueDate
      });

      if (result.success) {
        results.success.push({
          studentId: fee.studentId,
          email: fee.studentEmail
        });
      } else {
        results.failed.push({
          studentId: fee.studentId,
          email: fee.studentEmail,
          error: result.message
        });
      }
    } catch (error) {
      results.failed.push({
        studentId: fee.studentId,
        email: fee.studentEmail,
        error: error.message
      });
    }
  }

  // Send summary to admin
  try {
    const adminResult = await sendAdminFeeSummary(pendingFees);
    results.adminNotification = adminResult;
  } catch (error) {
    results.adminNotification = {
      success: false,
      error: error.message
    };
  }

  return results;
};

module.exports = {
  sendMonthlyFeeNotifications
}; 