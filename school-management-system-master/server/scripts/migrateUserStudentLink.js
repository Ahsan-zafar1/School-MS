/**
 * Migration: Populate user.student for all users with role = "student".
 * - Matches Student by email (user.email === student.email).
 * - Sets user.student = student._id only if not already set.
 *
 * Run from project root: node server/scripts/migrateUserStudentLink.js
 * Or from server folder: node scripts/migrateUserStudentLink.js
 */
const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Student = require('../models/Student');

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const studentUsers = await User.find({ role: 'student' }).lean();
    console.log(`Found ${studentUsers.length} user(s) with role "student".`);

    let updated = 0;
    let skipped = 0;
    let noMatch = 0;

    for (const user of studentUsers) {
      if (user.student) {
        skipped++;
        console.log(`  Skip (already set): ${user.email}`);
        continue;
      }

      const email = (user.email || '').trim().toLowerCase();
      if (!email) {
        noMatch++;
        console.log(`  No match (empty email): user _id=${user._id}`);
        continue;
      }

      const student = await Student.findOne({
        email: email,
        isActive: { $ne: false }
      }).select('_id name').lean();

      if (!student) {
        noMatch++;
        console.log(`  No Student found for email: ${email}`);
        continue;
      }

      await User.updateOne(
        { _id: user._id },
        { $set: { student: student._id } }
      );
      updated++;
      console.log(`  Linked: ${user.email} -> student ${student.name} (${student._id})`);
    }

    console.log('\n--- Migration summary ---');
    console.log(`Updated: ${updated}`);
    console.log(`Skipped (already set): ${skipped}`);
    console.log(`No matching Student: ${noMatch}`);
    console.log('------------------------\n');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
};

run();
