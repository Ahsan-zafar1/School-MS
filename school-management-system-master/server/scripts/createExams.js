const mongoose = require('mongoose');
const Exam = require('../models/Exam');
const User = require('../models/User');

async function createExams() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/school-management');
    
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      throw new Error('Admin user not found');
    }

    const exams = [
      {
        examName: 'Mid-Term Mathematics',
        subject: 'Mathematics',
        class: '10',
        date: new Date('2024-04-15'),
        startTime: '09:00',
        duration: 180,
        totalMarks: 100,
        passingMarks: 35,
        description: 'Mid-term examination covering algebra, geometry, and trigonometry',
        createdBy: admin._id
      },
      {
        examName: 'Final Science',
        subject: 'Science',
        class: '9',
        date: new Date('2024-04-20'),
        startTime: '10:00',
        duration: 180,
        totalMarks: 100,
        passingMarks: 35,
        description: 'Final examination covering physics, chemistry, and biology',
        createdBy: admin._id
      },
      {
        examName: 'English Literature',
        subject: 'English',
        class: '8',
        date: new Date('2024-04-18'),
        startTime: '09:30',
        duration: 120,
        totalMarks: 80,
        passingMarks: 28,
        description: 'Literature examination covering poetry, prose, and drama',
        createdBy: admin._id
      },
      {
        examName: 'History Mid-Term',
        subject: 'History',
        class: '7',
        date: new Date('2024-04-22'),
        startTime: '11:00',
        duration: 120,
        totalMarks: 80,
        passingMarks: 28,
        description: 'Mid-term examination covering world history',
        createdBy: admin._id
      },
      {
        examName: 'Geography Final',
        subject: 'Geography',
        class: '6',
        date: new Date('2024-04-25'),
        startTime: '10:30',
        duration: 120,
        totalMarks: 80,
        passingMarks: 28,
        description: 'Final examination covering physical and political geography',
        createdBy: admin._id
      },
      {
        examName: 'Computer Science',
        subject: 'Computer Science',
        class: '10',
        date: new Date('2024-04-28'),
        startTime: '09:00',
        duration: 150,
        totalMarks: 100,
        passingMarks: 35,
        description: 'Practical and theory examination covering programming and computer fundamentals',
        createdBy: admin._id
      },
      {
        examName: 'Hindi Literature',
        subject: 'Hindi',
        class: '9',
        date: new Date('2024-05-02'),
        startTime: '09:30',
        duration: 120,
        totalMarks: 80,
        passingMarks: 28,
        description: 'Hindi literature and grammar examination',
        createdBy: admin._id
      },
      {
        examName: 'Physics Practical',
        subject: 'Physics',
        class: '10',
        date: new Date('2024-05-05'),
        startTime: '10:00',
        duration: 180,
        totalMarks: 50,
        passingMarks: 18,
        description: 'Physics practical examination with lab experiments',
        createdBy: admin._id
      },
      {
        examName: 'Chemistry Theory',
        subject: 'Chemistry',
        class: '9',
        date: new Date('2024-05-08'),
        startTime: '09:00',
        duration: 180,
        totalMarks: 70,
        passingMarks: 25,
        description: 'Chemistry theory examination covering organic and inorganic chemistry',
        createdBy: admin._id
      },
      {
        examName: 'Biology Final',
        subject: 'Biology',
        class: '10',
        date: new Date('2024-05-10'),
        startTime: '10:30',
        duration: 180,
        totalMarks: 70,
        passingMarks: 25,
        description: 'Final biology examination covering botany and zoology',
        createdBy: admin._id
      }
    ];

    // Delete existing exams
    await Exam.deleteMany({});
    
    // Create new exams
    await Exam.insertMany(exams);
    console.log('✅ Example examinations created successfully');
    
    // Fetch and display all exams
    const allExams = await Exam.find();
    console.log('All examinations:', JSON.stringify(allExams, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createExams(); 