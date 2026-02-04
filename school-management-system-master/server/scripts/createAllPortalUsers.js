/**
 * Creates login users for ALL existing students and teachers in the system.
 * Each User is linked by email to the matching Student/Teacher record for portal access.
 *
 * Default passwords: students -> "student123", teachers -> "teacher123"
 * Run: node server/scripts/createAllPortalUsers.js
 * Or from server folder: node scripts/createAllPortalUsers.js
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
    console.log(`Found ${students.length} student(s) in the system.`);

    for (const s of students) {
      const email = (s.email || '').trim().toLowerCase();
      if (!email) {
        console.warn(`  Skip student "${s.name}" - no email`);
        skippedStudents.push({ name: s.name, reason: 'No email' });
        continue;
      }
      let user = await User.findOne({ email });
      if (user) {
        user.role = 'student';
        user.password = DEFAULT_STUDENT_PASSWORD;
        await user.save();
        skippedStudents.push({ name: s.name, email, reason: 'User existed, role/password updated' });
        continue;
      }
      user = new User({
        name: s.name || 'Student',
        email,
        password: DEFAULT_STUDENT_PASSWORD,
        role: 'student'
      });
      await user.save();
      createdStudents.push({ name: s.name, email, password: DEFAULT_STUDENT_PASSWORD });
      console.log(`  Created login for student: ${s.name} (${email})`);
    }

    // --- Teachers ---
    const teachers = await Teacher.find().lean();
    console.log(`\nFound ${teachers.length} teacher(s) in the system.`);

    for (const t of teachers) {
      const email = (t.email || '').trim().toLowerCase();
      if (!email) {
        console.warn(`  Skip teacher "${t.name}" - no email`);
        skippedTeachers.push({ name: t.name, reason: 'No email' });
        continue;
      }
      let user = await User.findOne({ email });
      if (user) {
        user.role = 'teacher';
        user.password = DEFAULT_TEACHER_PASSWORD;
        await user.save();
        skippedTeachers.push({ name: t.name, email, reason: 'User existed, role/password updated' });
        continue;
      }
      user = new User({
        name: t.name || 'Teacher',
        email,
        password: DEFAULT_TEACHER_PASSWORD,
        role: 'teacher'
      });
      await user.save();
      createdTeachers.push({ name: t.name, email, password: DEFAULT_TEACHER_PASSWORD });
      console.log(`  Created login for teacher: ${t.name} (${email})`);
    }

    // --- Summary ---
    console.log('\n========== LOGIN CREDENTIALS ==========\n');
    console.log('--- STUDENTS (password for all: ' + DEFAULT_STUDENT_PASSWORD + ') ---');
    [...createdStudents, ...skippedStudents.filter(x => x.email)].forEach((u, i) => {
      if (u.email) console.log(`${i + 1}. ${u.name} | Email: ${u.email} | Password: ${u.password || DEFAULT_STUDENT_PASSWORD}`);
    });
    console.log('\n--- TEACHERS (password for all: ' + DEFAULT_TEACHER_PASSWORD + ') ---');
    [...createdTeachers, ...skippedTeachers.filter(x => x.email)].forEach((u, i) => {
      if (u.email) console.log(`${i + 1}. ${u.name} | Email: ${u.email} | Password: ${u.password || DEFAULT_TEACHER_PASSWORD}`);
    });
    console.log('\n==========================================');
    console.log(`Created ${createdStudents.length} new student login(s), ${createdTeachers.length} new teacher login(s).`);
    if (skippedStudents.length || skippedTeachers.length) {
      console.log('Some users already existed and were updated (role/password).');
    }
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

createAllPortalUsers();
