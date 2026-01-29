const Fee = require('../models/Fee');
const User = require('../models/User');

const generateTestFees = async () => {
  try {
    // First, get or create a test student
    let testStudent = await User.findOne({ email: 'test.student@example.com' });
    
    if (!testStudent) {
      testStudent = await User.create({
        name: 'Test Student',
        email: 'test.student@example.com',
        password: 'password123',
        role: 'student'
      });
    }

    // Create test fees for the current month
    const currentDate = new Date();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const testFees = [
      {
        studentId: testStudent._id,
        amount: 5000,
        dueDate: new Date(currentDate.getFullYear(), currentDate.getMonth(), 15),
        status: 'pending',
        description: 'Monthly Tuition Fee'
      },
      {
        studentId: testStudent._id,
        amount: 2000,
        dueDate: new Date(currentDate.getFullYear(), currentDate.getMonth(), 20),
        status: 'pending',
        description: 'Transportation Fee'
      },
      {
        studentId: testStudent._id,
        amount: 1000,
        dueDate: new Date(currentDate.getFullYear(), currentDate.getMonth(), 25),
        status: 'pending',
        description: 'Library Fee'
      }
    ];

    // Insert test fees
    await Fee.insertMany(testFees);

    return {
      success: true,
      message: 'Test fees created successfully',
      studentId: testStudent._id,
      studentEmail: testStudent.email
    };
  } catch (error) {
    console.error('Error generating test fees:', error);
    return {
      success: false,
      message: error.message
    };
  }
};

module.exports = {
  generateTestFees
}; 