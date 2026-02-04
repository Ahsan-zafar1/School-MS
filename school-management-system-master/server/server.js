// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'School Management System API',
      version: '1.0.0',
      description: 'API documentation for School Management System',
    },
    servers: [
      {
        url: 'http://localhost:9999',
        description: 'Development server',
      },
    ],
  },
  apis: ['./routes/*.js'],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'School Management System API is running' });
});

// MongoDB connection with retry and admin creation
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/school-management';
    console.log('Attempting to connect to MongoDB at:', mongoURI);

    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4
    };

    await mongoose.connect(mongoURI, options);
    console.log('✅ MongoDB Connected Successfully');
    console.log('MongoDB connection state:', mongoose.connection.readyState);
    console.log('Connected to database:', mongoose.connection.name);

    // Check and create admin user if doesn't exist
    const User = require('./models/User');
    const adminExists = await User.findOne({ email: 'admin@school.com' });

    if (!adminExists) {
      console.log('Creating admin user...');
      await User.create({
        name: 'Admin',
        email: 'admin@school.com',
        password: 'admin123',
        role: 'admin',
        isActive: true,
      });
      console.log('✅ Admin user created successfully');
    }

    // Set up connection error handling
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected. Attempting to reconnect...');
      setTimeout(connectDB, 5000);
    });

    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB reconnected successfully');
    });
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    setTimeout(connectDB, 5000);
  }
};

// Import routes
const authRoutes = require('./routes/authRoutes');
const feeRoutes = require('./routes/feeRoutes');
const userRoutes = require('./routes/userRoutes');
const reportRoutes = require('./routes/reportRoutes');
const statsRoutes = require('./routes/statsRoutes');
const testRoutes = require('./routes/test');
const notificationRoutes = require('./routes/notificationRoutes');
const { router: activityRoutes, logActivity } = require('./routes/activityRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const studentRoutes = require('./routes/studentRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const classRoutes = require('./routes/classRoutes');
const resultRoutes = require('./routes/resultRoutes');
const examRoutes = require('./routes/examRoutes');
const examMarkRoutes = require('./routes/examMarkRoutes');
const academicYearRoutes = require('./routes/academicYearRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const meRoutes = require('./routes/meRoutes');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/test', testRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/exam-marks', examMarkRoutes);
app.use('/api/academic-years', academicYearRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/me', meRoutes);

// Activity logging middleware
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function (data) {
    if (req.user && req.method !== 'GET') {
      const action = {
        POST: 'create',
        PUT: 'update',
        PATCH: 'update',
        DELETE: 'delete',
      }[req.method] || 'other';

      const path = req.path.split('/');
      const entityType = path[2] || 'other';
      const entityId = path[3];
      const description = `${req.user.name} ${action}d a ${entityType}`;

      logActivity(req.user, action, description, entityType, entityId);
    }
    originalSend.apply(res, arguments);
  };
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

const PORT = process.env.PORT || 9999;

// Start server
const startServer = async () => {
  try {
    await connectDB();
    const server = app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`✅ Test the API: http://localhost:${PORT}/api/test/test-db`);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('Received SIGTERM. Shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('❌ Server startup error:', error);
  }
};

startServer();
