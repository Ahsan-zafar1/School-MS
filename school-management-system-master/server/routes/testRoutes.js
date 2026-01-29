const express = require('express');
const router = express.Router();
const { sendWelcomeEmail } = require('../utils/emailService');
const { generateTestFees } = require('../utils/testDataGenerator');
const { protect, authorize } = require('../middleware/auth');
const mongoose = require('mongoose');
const User = require('../models/User');

// Test MongoDB connection
router.get('/test-db', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState;
    const status = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    res.json({
      success: true,
      status: status[dbStatus],
      database: mongoose.connection.name,
      host: mongoose.connection.host
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection error',
      error: error.message
    });
  }
});

// Test email sending
router.get('/test-email', async (req, res) => {
  try {
    const result = await sendWelcomeEmail({
      name: "Test User",
      email: "mianahsan423@gmail.com"
    });
    
    if (result.success) {
      res.json({ success: true, message: 'Test email sent successfully', messageId: result.messageId });
    } else {
      res.status(500).json({ success: false, message: result.message });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create test admin user
router.post('/create-admin', async (req, res) => {
  try {
    // Check if admin already exists
    let admin = await User.findOne({ email: 'admin@school.com' });
    
    if (!admin) {
      admin = await User.create({
        name: 'Admin User',
        email: 'admin@school.com',
        password: 'admin123',
        role: 'admin'
      });
    }

    res.json({
      success: true,
      message: 'Admin user created successfully',
      data: {
        email: admin.email,
        password: 'admin123'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create admin user',
      error: error.message
    });
  }
});

// Generate test fees (admin only)
router.post('/generate-test-fees', protect, authorize('admin'), async (req, res) => {
  try {
    const result = await generateTestFees();
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router; 