const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const examRoutes = require('./routes/examRoutes');
const examMarkRoutes = require('./routes/examMarkRoutes');
const academicYearRoutes = require('./routes/academicYearRoutes');

// Routes
app.use('/api/exams', examRoutes);
app.use('/api/exam-marks', examMarkRoutes);
app.use('/api/academic-years', academicYearRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Handle 404 routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Export app
module.exports = app; 