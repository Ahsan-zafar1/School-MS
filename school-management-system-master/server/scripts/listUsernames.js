/**
 * Prints all users with their login identifiers (email or username).
 * Run from project root: node server/scripts/listUsernames.js
 * Or from server folder: node scripts/listUsernames.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const users = await User.find().select('name email username role').sort({ role: 1, name: 1 }).lean();
    console.log('\n========== USERS (Login: Email / Username) ==========\n');
    if (!users.length) {
      console.log('No users found.');
      process.exit(0);
      return;
    }
    users.forEach((u, i) => {
      const login = u.email || u.username || '—';
      const loginLabel = u.email ? 'Email' : (u.username ? 'Username' : '—');
      console.log(`${i + 1}. ${u.name || '—'} | ${u.role} | ${loginLabel}: ${login}`);
    });
    console.log('\n==========================================\n');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

run();
