const nodemailer = require('nodemailer');

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // use SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify transporter configuration
transporter.verify(function(error, success) {
  if (error) {
    console.log('❌ SMTP Connection Error:', error);
  } else {
    console.log('✅ SMTP Server is ready to send emails');
  }
});

const sendFeeReminder = async (student) => {
  const mailOptions = {
    from: `School Management <${process.env.EMAIL_USER}>`,
    to: student.email,
    subject: 'Monthly Fee Reminder',
    html: `
      <h2>Fee Reminder</h2>
      <p>Dear ${student.name},</p>
      <p>This is a reminder that your fee payment of Rs. ${student.amount} is due on ${student.dueDate}.</p>
      <p>Please make the payment before the due date to avoid any late fees.</p>
      <br>
      <p>Best regards,</p>
      <p>School Management Team</p>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Fee reminder sent successfully');
    console.log('Message ID:', info.messageId);
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    return { success: true, message: 'Email sent successfully', messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email failed:', error);
    console.error('Error details:', {
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode
    });
    return { success: false, message: error.message };
  }
};

const sendWelcomeEmail = async (user) => {
  const mailOptions = {
    from: `School Management <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: 'Welcome to School Management System',
    html: `
      <h2>Welcome to School Management System</h2>
      <p>Dear ${user.name},</p>
      <p>Welcome to our School Management System. Your account has been successfully created.</p>
      <p>You can now log in to access your dashboard and manage your information.</p>
      <br>
      <p>Best regards,</p>
      <p>School Management Team</p>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Welcome email sent successfully');
    console.log('Message ID:', info.messageId);
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    return { success: true, message: 'Welcome email sent successfully', messageId: info.messageId };
  } catch (error) {
    console.error('❌ Welcome email failed:', error);
    console.error('Error details:', {
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode
    });
    return { success: false, message: error.message };
  }
};

const sendAdminFeeSummary = async (pendingFees) => {
  const totalAmount = pendingFees.reduce((sum, fee) => sum + fee.amount, 0);
  const mailOptions = {
    from: `School Management <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER, // Send to admin email
    subject: 'Monthly Fee Collection Summary',
    html: `
      <h2>Monthly Fee Collection Summary</h2>
      <p>Dear Admin,</p>
      <p>Here is a summary of pending fees for the current month:</p>
      <ul>
        ${pendingFees.map(fee => `
          <li>
            Student: ${fee.studentName}<br>
            Email: ${fee.studentEmail}<br>
            Amount: Rs. ${fee.amount}<br>
            Due Date: ${new Date(fee.dueDate).toLocaleDateString()}
          </li>
        `).join('')}
      </ul>
      <p><strong>Total Pending Amount: Rs. ${totalAmount}</strong></p>
      <p>Total Pending Fees: ${pendingFees.length}</p>
      <br>
      <p>Best regards,</p>
      <p>School Management System</p>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Admin summary sent successfully');
    console.log('Message ID:', info.messageId);
    return { success: true, message: 'Admin summary sent successfully', messageId: info.messageId };
  } catch (error) {
    console.error('❌ Admin summary failed:', error);
    return { success: false, message: error.message };
  }
};

module.exports = {
  sendFeeReminder,
  sendWelcomeEmail,
  sendAdminFeeSummary
};
