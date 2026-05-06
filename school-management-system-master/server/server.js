// Load environment variables
require('dotenv').config();

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET is required in production. Set it in your .env file.');
    process.exit(1);
  }
  process.env.JWT_SECRET = 'dev-insecure-jwt-secret-change-for-production';
  console.warn('⚠️  JWT_SECRET not set; using a dev-only default. Set JWT_SECRET in .env for real use.');
}

process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('uncaughtException:', err);
});

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

// Reject /api/* when MongoDB is not ready (clear 503 instead of random 500s in every module)
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) {
    return next();
  }
  if (req.path.startsWith('/api/test')) {
    return next();
  }
  if (mongoose.connection.readyState === 1) {
    return next();
  }
  return res.status(503).json({
    success: false,
    message: 'Service unavailable: database not connected. Start MongoDB and check MONGODB_URI.',
  });
});

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

// MongoDB: register event listeners once — repeating them on every reconnect caused a
// listener stack and reconnect storms, which can crash the process and reset port 9999.
let dbEventListenersRegistered = false;
let reconnectTimer = null;

const scheduleDBReconnect = (delayMs = 5000) => {
  if (reconnectTimer) {
    return;
  }
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectDB().catch((e) => console.error('DB reconnect error:', e.message));
  }, delayMs);
};

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/school-management';
  const options = {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    family: 4,
  };

  if (!dbEventListenersRegistered) {
    dbEventListenersRegistered = true;
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err?.message || err);
    });
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected. Scheduling reconnect...');
      scheduleDBReconnect(5000);
    });
    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB connection active');
    });
  }

  if (mongoose.connection.readyState === 1) {
    return;
  }

  try {
    console.log('Attempting to connect to MongoDB at:', mongoURI);
    await mongoose.connect(mongoURI, options);
    console.log('✅ MongoDB Connected Successfully');
    console.log('MongoDB connection state:', mongoose.connection.readyState);
    console.log('Connected to database:', mongoose.connection.name);

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

    const Subject = require('./models/Subject');
    if ((await Subject.countDocuments()) === 0) {
      const defaults = [
        'Mathematics',
        'Physics',
        'Chemistry',
        'Biology',
        'English',
        'History',
        'Geography',
        'Computer Science',
        'Art',
        'Music',
        'Physical Education',
      ];
      await Subject.insertMany(defaults.map((name, i) => ({ name, sortOrder: i, isActive: true })));
      console.log('✅ Default subjects created (manage under Subjects in the app)');
    }
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    scheduleDBReconnect(5000);
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
const announcementRoutes = require('./routes/announcementRoutes');
const subjectRoutes = require('./routes/subjectRoutes');

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
app.use('/api/announcements', announcementRoutes);
app.use('/api/subjects', subjectRoutes);

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
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Stop the other Node process or set PORT in .env.`);
      } else {
        console.error('❌ HTTP server error:', err.message);
      }
      process.exit(1);
    });

    const shutdown = () => {
      server.close(() => {
        mongoose.connection
          .close()
          .then(() => {
            console.log('Server and DB connection closed');
            process.exit(0);
          })
          .catch((e) => {
            console.error('Error closing MongoDB:', e);
            process.exit(1);
          });
      });
    };
    process.on('SIGTERM', () => {
      console.log('Received SIGTERM. Shutting down gracefully...');
      shutdown();
    });
    process.on('SIGINT', () => {
      console.log('Received SIGINT. Shutting down gracefully...');
      shutdown();
    });
  } catch (error) {
    console.error('❌ Server startup error:', error);
  }
};

startServer();
