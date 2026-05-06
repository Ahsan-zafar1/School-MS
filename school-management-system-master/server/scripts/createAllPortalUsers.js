/**
 * Creates login users for ALL existing students and teachers.
 * Option 1: If they have email – User is created/linked by email.
 * Option 2: If they have NO email – User is created with username = studentId/teacherId and linked by ObjectId.
 *
 * Default passwords: students -> "student123", teachers -> "teacher123"
 * Run: node server/scripts/createAllPortalUsers.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');

const DEFAULT_STUDENT_PASSWORD = 'student123';
const DEFAULT_TEACHER_PASSWORD = 'teacher123';

const createAllPortalUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const createdStudents = [];
    const createdTeachers = [];
    const skippedStudents = [];
    const skippedTeachers = [];

    // --- Students ---
    const students = await Student.find().lean();
    console.log(`Found ${students.length} student(s).`);

    for (const s of students) {
      const email = (s.email || '').trim().toLowerCase() || null;
      const loginId = (s.studentId || s._id.toString()).toLowerCase().replace(/\s/g, '');
      let user = email ? await User.findOne({ email }) : await User.findOne({ username: loginId });
      if (user) {
        user.role = 'student';
        user.password = DEFAULT_STUDENT_PASSWORD;
        if (!user.student) user.student = s._id;
        await user.save();
        skippedStudents.push({ name: s.name, login: email || loginId, reason: 'User existed, updated' });
        continue;
      }
      user = new User({
        name: s.name || 'Student',
        email: email,
        username: email ? null : loginId,
        password: DEFAULT_STUDENT_PASSWORD,
        role: 'student',
        student: s._id
      });
      await user.save();
      createdStudents.push({
        name: s.name,
        login: email || loginId,
        loginType: email ? 'email' : 'username',
        password: DEFAULT_STUDENT_PASSWORD
      });
      console.log(`  Created: ${s.name} | Login: ${email || loginId} (${email ? 'email' : 'username'})`);
    }

    // --- Teachers ---
    const teachers = await Teacher.find().lean();
    console.log(`\nFound ${teachers.length} teacher(s).`);

    for (const t of teachers) {
      const email = (t.email || '').trim().toLowerCase() || null;
      const loginId = (t.teacherId || t._id.toString()).toLowerCase().replace(/\s/g, '');
      let user = email ? await User.findOne({ email }) : await User.findOne({ username: loginId });
      if (user) {
        user.role = 'teacher';
        user.password = DEFAULT_TEACHER_PASSWORD;
        if (!user.teacher) user.teacher = t._id;
        await user.save();
        skippedTeachers.push({ name: t.name, login: email || loginId, reason: 'User existed, updated' });
        continue;
      }
      user = new User({
        name: t.name || 'Teacher',
        email: email,
        username: email ? null : loginId,
        password: DEFAULT_TEACHER_PASSWORD,
        role: 'teacher',
        teacher: t._id
      });
      await user.save();
      createdTeachers.push({
        name: t.name,
        login: email || loginId,
        loginType: email ? 'email' : 'username',
        password: DEFAULT_TEACHER_PASSWORD
      });
      console.log(`  Created: ${t.name} | Login: ${email || loginId} (${email ? 'email' : 'username'})`);
    }

    // --- Summary ---
    console.log('\n========== LOGIN CREDENTIALS ==========\n');
    console.log('--- STUDENTS (password: ' + DEFAULT_STUDENT_PASSWORD + ') ---');
    [...createdStudents, ...skippedStudents].forEach((u, i) => {
      const label = (u.loginType === 'username' || (u.login && !u.login.includes('@'))) ? 'Username' : 'Email';
      console.log(`${i + 1}. ${u.name} | ${label}: ${u.login} | Password: ${u.password || DEFAULT_STUDENT_PASSWORD}`);
    });
    console.log('\n--- TEACHERS (password: ' + DEFAULT_TEACHER_PASSWORD + ') ---');
    [...createdTeachers, ...skippedTeachers].forEach((u, i) => {
      const label = (u.loginType === 'username' || (u.login && !u.login.includes('@'))) ? 'Username' : 'Email';
      console.log(`${i + 1}. ${u.name} | ${label}: ${u.login} | Password: ${u.password || DEFAULT_TEACHER_PASSWORD}`);
    });
    console.log('\n==========================================');
    console.log('Users without email log in with Username (e.g. studentId/teacherId).');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

createAllPortalUsers();
