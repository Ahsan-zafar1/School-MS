const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const seedAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/school-management');
    console.log('Connected to MongoDB');

    // Check if admin exists
    const adminExists = await User.findOne({ email: 'admin@school.com' });
    if (adminExists) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const admin = await User.create({
      name: 'Admin',
      email: 'admin@school.com',
      password: 'admin123',
      role: 'admin',
      isActive: true
    });

    console.log('Admin user created successfully:', admin.email);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin(); 