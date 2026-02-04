/**
 * Creates a test student User + Student record so the student can log in to the portal.
 * User email must match Student email for the portal to link them.
 *
 * Run: node server/scripts/createStudentUser.js
 * Or from server folder: node scripts/createStudentUser.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Student = require('../models/Student');

const STUDENT_EMAIL = 'student@school.com';
const STUDENT_PASSWORD = 'student123';
const STUDENT_NAME = 'Test Student';

const createStudentUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    let user = await User.findOne({ email: STUDENT_EMAIL });
    if (!user) {
      user = new User({
        name: STUDENT_NAME,
        email: STUDENT_EMAIL,
        password: STUDENT_PASSWORD,
        role: 'student'
      });
      await user.save();
      console.log('Student user created:', STUDENT_EMAIL);
    } else {
      user.password = STUDENT_PASSWORD;
      user.role = 'student';
      await user.save();
      console.log('Student user updated (password reset):', STUDENT_EMAIL);
    }

    let student = await Student.findOne({ email: STUDENT_EMAIL });
    if (!student) {
      student = await Student.create({
        name: STUDENT_NAME,
        email: STUDENT_EMAIL,
        phone: '1234567890',
        class: 'Class 10',
        address: '123 School Street'
      });
      console.log('Student record created (same email as user)');
    } else {
      console.log('Student record already exists for:', STUDENT_EMAIL);
    }

    console.log('\n--- Student login credentials ---');
    console.log('Email:', STUDENT_EMAIL);
    console.log('Password:', STUDENT_PASSWORD);
    console.log('----------------------------------\n');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

createStudentUser();
