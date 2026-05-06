const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Class = require('../models/Class');
const StudentEnrollmentHistory = require('../models/StudentEnrollmentHistory');
const { protect } = require('../middleware/auth');
const { createPortalUserForStudent } = require('../helpers/createPortalUser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fastcsv = require('fast-csv');
const csvParser = require('csv-parser');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { searchRegexFromQuery, pickSortField, STUDENT_LIST_SORT } = require('../utils/queryHelpers');
const multerCsv = multer({ dest: 'tmp/csv/' });
const multerExcel = multer({ 
  dest: 'tmp/excel/',
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];
    if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel (.xlsx, .xls) and CSV files are allowed.'));
    }
  }
});

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads', 'students');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Ensure tmp directories exist
const tmpCsvDir = path.join(__dirname, '..', 'tmp', 'csv');
const tmpExcelDir = path.join(__dirname, '..', 'tmp', 'excel');
if (!fs.existsSync(tmpCsvDir)) {
  fs.mkdirSync(tmpCsvDir, { recursive: true });
}
if (!fs.existsSync(tmpExcelDir)) {
  fs.mkdirSync(tmpExcelDir, { recursive: true });
}

// Function to generate a unique student tracking ID (permanent, never changes)
const generateStudentId = async () => {
  // Find the highest student ID
  const lastStudent = await Student.findOne()
    .sort({ studentId: -1 })
    .select('studentId')
    .lean();
  
  let nextSequenceNumber = 1;
  
  if (lastStudent && lastStudent.studentId) {
    // Extract number from format STU-XXX or YYYY-STU-XXX
    const match = lastStudent.studentId.match(/(?:(\d{4})-)?STU-(\d+)$/);
    if (match) {
      const sequenceNum = parseInt(match[2], 10);
      nextSequenceNumber = sequenceNum + 1;
    }
  }
  
  // Format: STU-XXX (e.g., STU-001, STU-002, STU-100)
  const generatedStudentId = `STU-${nextSequenceNumber.toString().padStart(6, '0')}`;
  console.log(`Generated student ID: ${generatedStudentId}`);
  
  return generatedStudentId;
};

const logEnrollmentHistory = async (entry) => {
  try {
    await StudentEnrollmentHistory.create(entry);
  } catch (error) {
    // Non-blocking audit trail: never fail primary student operations.
    console.error('Failed to write student enrollment history:', error.message);
  }
};

// Helper function to generate ID card design (matches provided design)
const generateIDCardDesign = async (doc, student, uploadDir, path, fs, QRCode) => {
  // Card dimensions - horizontal orientation (wider)
  const cardWidth = 600; // 8.33" in points
  const cardHeight = 380; // 5.28" in points
  
  // White background
  doc.rect(0, 0, cardWidth, cardHeight)
    .fillColor('#FFFFFF')
    .fill();
  
  // Top wave-like curves section
  // Golden yellow band (topmost)
  doc.rect(0, 0, cardWidth, 30)
    .fillColor('#FFD700') // Golden yellow
    .fill();
  
  // Create wave effect for golden yellow
  for (let x = 0; x < cardWidth; x += 200) {
    doc.circle(x + 100, 0, 30)
      .fillColor('#FFD700')
      .fill();
  }
  
  // Light blue band (middle)
  doc.rect(0, 25, cardWidth, 25)
    .fillColor('#4A90E2') // Light blue
    .fill();
  
  // Create wave effect for light blue
  for (let x = 0; x < cardWidth; x += 200) {
    doc.circle(x + 100, 25, 25)
      .fillColor('#4A90E2')
      .fill();
  }
  
  // Dark blue band (bottom of wave section)
  doc.rect(0, 45, cardWidth, 75)
    .fillColor('#1e3a8a') // Dark blue
    .fill();
  
  // Logo area (left side in blue band) - simplified laurel wreath with graduation cap
  const logoX = 20;
  const logoY = 55;
  const logoSize = 50;
  
  // Draw simplified logo (circle with graduation cap)
  doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2)
    .strokeColor('#FFD700')
    .lineWidth(2)
    .stroke();
  
  // Graduation cap symbol
  doc.rect(logoX + 10, logoY + 15, 30, 8)
    .fillColor('#FFD700')
    .fill();
  doc.circle(logoX + 25, logoY + 23, 8)
    .fillColor('#FFD700')
    .fill();
  
  // Institution name (white text on blue background)
  doc.fillColor('#FFFFFF')
    .fontSize(14)
    .font('Helvetica-Bold')
    .text('School Management System', logoX + logoSize + 10, logoY + 10, {
      width: 300
    });
  
  // Address (white text, smaller)
  doc.fillColor('#FFFFFF')
    .fontSize(8)
    .font('Helvetica')
    .text('123 Education Street, Learning City, LC 12345', logoX + logoSize + 10, logoY + 30, {
      width: 300
    });
  
  // Golden yellow bar for student name
  const nameBarY = 130;
  const nameBarHeight = 35;
  doc.rect(0, nameBarY, cardWidth, nameBarHeight)
    .fillColor('#FFD700') // Golden yellow
    .fill();
  
  // Student name in bold black on golden bar
  doc.fillColor('#000000')
    .fontSize(18)
    .font('Helvetica-Bold')
    .text(student.name.toUpperCase(), 20, nameBarY + 8, {
      width: cardWidth - 40,
      align: 'left'
    });
  
  // Student details section (left side, below name bar)
  const detailsStartY = nameBarY + nameBarHeight + 15;
  const detailsX = 20;
  const lineHeight = 20;
  
  doc.fillColor('#000000')
    .fontSize(10)
    .font('Helvetica-Bold');
  
  // Student ID
  doc.text('Student Id:', detailsX, detailsStartY);
  doc.font('Helvetica')
    .text(student.studentId || 'N/A', detailsX + 90, detailsStartY);
  
  // Date of Birth
  const dob = student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }) : 'N/A';
  doc.font('Helvetica-Bold')
    .text('D.O.B:', detailsX, detailsStartY + lineHeight);
  doc.font('Helvetica')
    .text(dob, detailsX + 90, detailsStartY + lineHeight);
  
  // Address
  doc.font('Helvetica-Bold')
    .text('Address:', detailsX, detailsStartY + lineHeight * 2);
  doc.font('Helvetica')
    .text(student.address || 'N/A', detailsX + 90, detailsStartY + lineHeight * 2, {
      width: 250
    });
  
  // Class and Roll Number (additional info)
  doc.font('Helvetica-Bold')
    .text('Class:', detailsX, detailsStartY + lineHeight * 3);
  doc.font('Helvetica')
    .text(student.class || 'N/A', detailsX + 90, detailsStartY + lineHeight * 3);
  
  doc.font('Helvetica-Bold')
    .text('Roll No:', detailsX, detailsStartY + lineHeight * 4);
  doc.font('Helvetica')
    .text(student.rollNumber || 'N/A', detailsX + 90, detailsStartY + lineHeight * 4);
  
  // Photo section (right side) - circular with thick dark blue border
  const photoSize = 140;
  const photoX = cardWidth - photoSize - 40; // Right side with margin
  const photoY = nameBarY + 10; // Align with name bar
  
  // Thick dark blue circular border
  doc.circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2 + 5)
    .fillColor('#1e3a8a')
    .fill();
  
  // White circle inside border
  doc.circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2)
    .fillColor('#FFFFFF')
    .fill();
  
  // Load student photo or show placeholder
  let photoLoaded = false;
  if (student.photo) {
    try {
      let photoFilename = student.photo;
      if (photoFilename.includes('uploads/students/')) {
        photoFilename = photoFilename.split('uploads/students/')[1];
      } else if (photoFilename.startsWith('http://localhost:9999/')) {
        photoFilename = photoFilename.replace('http://localhost:9999/uploads/students/', '');
      }
      
      const photoPath = path.join(uploadDir, photoFilename);
      
      if (fs.existsSync(photoPath)) {
        // Create circular clipping for photo
        const centerX = photoX + photoSize / 2;
        const centerY = photoY + photoSize / 2;
        const radius = photoSize / 2 - 2;
        
        // Draw photo with circular mask
        doc.save();
        doc.circle(centerX, centerY, radius)
          .clip();
        
        doc.image(photoPath, photoX + 2, photoY + 2, {
          width: photoSize - 4,
          height: photoSize - 4,
          fit: [photoSize - 4, photoSize - 4]
        });
        
        doc.restore();
        photoLoaded = true;
      }
    } catch (error) {
      console.error('Error loading photo:', error);
      photoLoaded = false;
    }
  }
  
  // Placeholder if no photo
  if (!photoLoaded) {
    doc.circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2 - 2)
      .fillColor('#E0E0E0')
      .fill();
    
    doc.fillColor('#1e3a8a')
      .fontSize(48)
      .font('Helvetica-Bold')
      .text(student.name.charAt(0).toUpperCase(), photoX + photoSize / 2 - 20, photoY + photoSize / 2 - 25, {
        align: 'center',
        width: photoSize
      });
  }
  
  // QR Code (bottom right, smaller)
  const qrSize = 60;
  const qrX = cardWidth - qrSize - 20;
  const qrY = cardHeight - qrSize - 20;
  
  // Generate QR code
  const qrData = JSON.stringify({
    studentId: student.studentId,
    name: student.name,
    class: student.class,
    rollNumber: student.rollNumber,
    email: student.email
  });
  
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      width: qrSize,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    if (qrCodeDataUrl) {
      const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
      const qrBuffer = Buffer.from(base64Data, 'base64');
      doc.image(qrBuffer, qrX, qrY, {
        width: qrSize,
        height: qrSize
      });
    }
  } catch (error) {
    console.error('Error generating QR code:', error);
  }
};

// Function to generate a unique roll number based on class
const generateRollNumber = async (className) => {
  if (!className) {
    throw new Error('Class is required to generate roll number');
  }
  
  // Find all students in the same class
  const studentsInClass = await Student.find({ class: className })
    .select('rollNumber')
    .lean();
  
  console.log(`Generating roll number for class: ${className}`);
  console.log(`Found ${studentsInClass.length} students in class ${className}`);
  
  let maxSequenceNumber = 0;
  
  // Extract sequence numbers from roll numbers that match CLASS-XXX format
  studentsInClass.forEach(student => {
    if (student.rollNumber) {
      // Check if roll number matches the format: CLASS-XXX (e.g., 10A-001, 9B-015)
      // Escape special regex characters in className
      const escapedClassName = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`^${escapedClassName}-(\\d+)$`);
      const match = student.rollNumber.match(pattern);
      
      if (match) {
        const sequenceNum = parseInt(match[1], 10);
        console.log(`Found roll number: ${student.rollNumber}, sequence: ${sequenceNum}`);
        if (sequenceNum > maxSequenceNumber) {
          maxSequenceNumber = sequenceNum;
        }
      } else {
        console.log(`Skipping roll number (old format): ${student.rollNumber}`);
      }
    }
  });
  
  // Next sequence number is max + 1, or 1 if no valid roll numbers found
  const nextSequenceNumber = maxSequenceNumber + 1;
  
  // Format: CLASS-XXX (e.g., 10A-001, 9B-015)
  const generatedRollNumber = `${className}-${nextSequenceNumber.toString().padStart(3, '0')}`;
  console.log(`Generated roll number: ${generatedRollNumber} (max was: ${maxSequenceNumber})`);
  
  return generatedRollNumber;
};

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, 'student-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5000000 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Error: Images Only!'));
    }
  }
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size is too large. Maximum size is 5MB.',
        error: err.message
      });
    }
    return res.status(400).json({
      success: false,
      message: 'File upload error',
      error: err.message
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload error',
      error: err.message
    });
  }
  next();
};

// Get students by class
router.get('/class/:className', protect, async (req, res) => {
  try {
    const { className } = req.params;
    const { classId } = req.query;
    let students = [];

    // Preferred: exact class-section membership via Class.students
    if (classId) {
      if (!require('mongoose').Types.ObjectId.isValid(classId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid class id'
        });
      }

      const classData = await Class.findById(classId)
        .select('name section')
        .lean();

      if (!classData) {
        return res.status(404).json({
          success: false,
          message: 'Class not found'
        });
      }

      students = await Student.find({
        $or: [
          { classRef: classData._id },
          { class: classData.name, section: classData.section },
          { class: classData.name, section: { $exists: false } },
          { class: classData.name, section: '' }
        ]
      })
        .select('name rollNumber email class section')
        .sort({ rollNumber: 1 });
    } else {
      // Backward-compatible fallback (name-only; can mix sections with same class name)
      students = await Student.find({ class: className })
        .select('name rollNumber email class')
        .sort({ rollNumber: 1 });
    }

    res.json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    console.error('Error fetching students by class:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching students by class',
      error: error.message
    });
  }
});

// Get all students with pagination and filtering
router.get('/', protect, async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Sorting parameters
    const sortBy = pickSortField(req.query.sortBy, STUDENT_LIST_SORT, 'createdAt');
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortOrder };

    // Build filter query
    const filter = {};

    // Search filter (name, email, rollNumber, studentId)
    if (req.query.search) {
      const searchRegex = searchRegexFromQuery(req.query.search);
      if (searchRegex) {
        filter.$or = [
          { name: searchRegex },
          { email: searchRegex },
          { rollNumber: searchRegex },
          { studentId: searchRegex }
        ];
      }
    }

    // Class filter
    if (req.query.class) {
      filter.class = req.query.class;
    }

    // Tracking ID filter
    if (req.query.trackingId) {
      const tr = searchRegexFromQuery(req.query.trackingId);
      if (tr) filter.studentId = tr;
    }

    // Status filter
    if (req.query.status !== undefined && req.query.status !== '') {
      filter.isActive = req.query.status === 'true' || req.query.status === 'active';
    }

    // Date range filters
    if (req.query.admissionDateFrom || req.query.admissionDateTo) {
      filter.admissionDate = {};
      if (req.query.admissionDateFrom) {
        filter.admissionDate.$gte = new Date(req.query.admissionDateFrom);
      }
      if (req.query.admissionDateTo) {
        filter.admissionDate.$lte = new Date(req.query.admissionDateTo);
      }
    }

    // Gender filter
    if (req.query.gender) {
      filter.gender = req.query.gender;
    }

    // Get total count for pagination
    const total = await Student.countDocuments(filter);

    // Calculate pagination info
    const totalPages = Math.max(1, Math.ceil(total / limit)); // Ensure at least 1 page
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    // Ensure page is within valid range
    const validPage = total > 0 ? Math.min(page, totalPages) : 1;
    const validSkip = (validPage - 1) * limit;

    // Fetch students with pagination
    const studentsRaw = await Student.find(filter)
      .sort(sort)
      .skip(validSkip)
      .limit(limit)
      .lean();

    // Fill parent* from father/mother/guardian when parent fields are empty
    const students = studentsRaw.map((s) => {
      const o = { ...s };
      if (!o.parentName) {
        o.parentName = o.fatherName || o.motherName || o.guardianName;
      }
      if (!o.parentPhone) {
        o.parentPhone = o.fatherPhone || o.motherPhone || o.guardianPhone;
      }
      return o;
    });

    res.json({
      success: true,
      data: students,
      pagination: {
        currentPage: validPage,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching students',
      error: error.message
    });
  }
});

// Get available students (not assigned to any class)
router.get('/available', protect, async (req, res) => {
  try {
    // Get all students with their class information
    const students = await Student.find()
      .select('name rollNumber email class')
      .sort({ rollNumber: 1 });

    // Filter out students that are already assigned to any class
    const availableStudents = students.filter(student => !student.class);

    res.json({
      success: true,
      count: availableStudents.length,
      data: availableStudents
    });
  } catch (error) {
    console.error('Error fetching available students:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available students',
      error: error.message
    });
  }
});

// Add new student
router.post('/', protect, upload.single('photo'), handleMulterError, async (req, res) => {
  try {
    // Log the request body for debugging
    console.log('Request body:', req.body);
    
    // Validate class is provided (required for roll number generation)
    if (!req.body.class) {
      return res.status(400).json({
        success: false,
        message: 'Class is required to generate roll number'
      });
    }
    
    // ALWAYS generate roll number for new students - ignore any value sent from frontend
    // This ensures we always use the correct CLASS-XXX format
    console.log('=== ROLL NUMBER GENERATION DEBUG ===');
    console.log('Received rollNumber from request:', req.body.rollNumber);
    console.log('Received class from request:', req.body.class);
    
    const className = req.body.class;
    
    // ALWAYS generate roll number - don't use any value from frontend for new students
    // This prevents old format roll numbers from being used
    let rollNumber;
    try {
      rollNumber = await generateRollNumber(className);
      console.log('Generated roll number:', rollNumber);
    } catch (error) {
      console.error('Error generating roll number:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to generate roll number'
      });
    }
    
    console.log('Final roll number to use:', rollNumber);
    console.log('=== END ROLL NUMBER DEBUG ===');
    
    // Create studentData - explicitly exclude rollNumber from req.body and use generated one
    const { rollNumber: reqRollNumber, ...bodyWithoutRollNumber } = req.body;
    console.log('req.body.rollNumber (will be ignored):', reqRollNumber);
    console.log('Generated rollNumber (will be used):', rollNumber);
    
    const studentData = {
      ...bodyWithoutRollNumber,
      rollNumber: rollNumber, // ALWAYS use the generated rollNumber - explicitly set it
      photo: req.file ? `http://localhost:9999/uploads/students/${req.file.filename}` : undefined
    };
    
    // CRITICAL: Force set rollNumber again to ensure it's not overwritten
    studentData.rollNumber = rollNumber;
    
    // Log to verify we're using the correct roll number
    console.log('=== VERIFICATION ===');
    console.log('studentData.rollNumber:', studentData.rollNumber);
    console.log('Expected format:', `${className}-XXX`);
    console.log('Is correct format?', studentData.rollNumber.startsWith(`${className}-`));
    console.log('===================');
    
    // Convert isActive from string to boolean
    if (studentData.isActive !== undefined && studentData.isActive !== null) {
      // Handle both string and boolean values
      if (typeof studentData.isActive === 'string') {
        studentData.isActive = studentData.isActive === 'true' || studentData.isActive === 'True';
      } else {
        studentData.isActive = Boolean(studentData.isActive);
      }
    } else {
      // Default to true if not provided
      studentData.isActive = true;
    }
    
    // Ensure parentName and parentPhone are strings (not undefined)
    if (studentData.parentName === undefined) studentData.parentName = '';
    if (studentData.parentPhone === undefined) studentData.parentPhone = '';
    
    // CRITICAL: Force set rollNumber one more time before creating to ensure it's correct
    // This prevents any possibility of the old rollNumber from req.body being used
    studentData.rollNumber = rollNumber;
    
    // Log the student data for debugging
    console.log('=== FINAL STUDENT DATA BEFORE CREATE ===');
    console.log('Generated rollNumber variable:', rollNumber);
    console.log('rollNumber in studentData:', studentData.rollNumber);
    console.log('Expected format:', `${className}-XXX`);
    console.log('Is correct format?', studentData.rollNumber && studentData.rollNumber.startsWith(`${className}-`));
    
    // Final verification - if rollNumber doesn't match, throw error
    if (!studentData.rollNumber || !studentData.rollNumber.startsWith(`${className}-`)) {
      console.error('ERROR: Roll number format is incorrect!');
      console.error('Expected:', `${className}-XXX`);
      console.error('Got:', studentData.rollNumber);
      // Force regenerate
      studentData.rollNumber = await generateRollNumber(className);
      console.log('Regenerated rollNumber:', studentData.rollNumber);
    }
    
    console.log('Final rollNumber being saved:', studentData.rollNumber);
    console.log('========================================');
    
    const student = await Student.create(studentData);

    await logEnrollmentHistory({
      student: student._id,
      action: 'create',
      fromClass: '',
      toClass: student.class || '',
      fromAcademicYear: '',
      toAcademicYear: req.body.academicYear || '',
      note: 'Student created',
      changedBy: req.user?._id,
      changedAt: new Date(),
    });
    
    // Auto-create portal login user for this student (email or username = rollNumber/studentId)
    const portalResult = await createPortalUserForStudent(student);
    if (portalResult.created) {
      console.log('Portal user created for student:', student.name, '| Login:', student.email || student.rollNumber || student.studentId);
    } else {
      console.log('Portal user for student:', student.name, '—', portalResult.message);
    }

    // Verify the created student has correct roll number
    console.log('Created student rollNumber:', student.rollNumber);
    if (student.rollNumber && !student.rollNumber.startsWith(`${className}-`)) {
      console.error('ERROR: Student was created with incorrect roll number format!');
      console.error('Expected:', `${className}-XXX`);
      console.error('Got:', student.rollNumber);
    }
    res.status(201).json({
      success: true,
      data: student,
      portalUserCreated: portalResult.created,
      portalLogin: portalResult.created ? (student.email || student.rollNumber || student.studentId) : undefined
    });
  } catch (error) {
    console.error('Error creating student:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = {};
      Object.keys(error.errors).forEach(key => {
        validationErrors[key] = error.errors[key].message;
      });
      
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationErrors
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `Duplicate value for ${field}`,
        error: error.message
      });
    }
    
    res.status(400).json({
      success: false,
      message: 'Error creating student',
      error: error.message
    });
  }
});

// Create portal login user for an existing student (e.g. added before auto-create was enabled)
router.post('/:id/create-portal-user', protect, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).lean();
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    const result = await createPortalUserForStudent(student);
    if (result.created) {
      return res.status(201).json({
        success: true,
        message: result.message,
        login: student.email || student.rollNumber || student.studentId,
        password: 'student123'
      });
    }
    return res.status(200).json({
      success: false,
      message: result.message
    });
  } catch (err) {
    console.error('Create portal user error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to create portal user' });
  }
});

// Update student
router.put('/:id', protect, upload.single('photo'), handleMulterError, async (req, res) => {
  try {
    // Log the request body for debugging
    console.log('Request body:', req.body);
    console.log('isActive value:', req.body.isActive, 'Type:', typeof req.body.isActive);
    
    // Get the existing student to check current values
    const existingStudent = await Student.findById(req.params.id);
    if (!existingStudent) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const oldClass = existingStudent.class || '';
    
    // If roll number is being changed, validate uniqueness within the class
    if (req.body.rollNumber && req.body.rollNumber !== existingStudent.rollNumber) {
      const className = req.body.class || existingStudent.class;
      const duplicateStudent = await Student.findOne({ 
        rollNumber: req.body.rollNumber,
        class: className,
        _id: { $ne: req.params.id } // Exclude current student
      });
      
      if (duplicateStudent) {
        return res.status(400).json({
          success: false,
          message: `Roll number ${req.body.rollNumber} already exists in class ${className}`
        });
      }
    }
    
    // If class is being changed, regenerate roll number if it doesn't match new class format
    if (req.body.class && req.body.class !== existingStudent.class) {
      const newClass = req.body.class;
      const escapedClassName = newClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const classBasedPattern = new RegExp(`^${escapedClassName}-\\d+$`);
      
      // Check if provided rollNumber matches the new class format
      const providedRollNumber = req.body.rollNumber;
      const shouldRegenerate = !providedRollNumber || !classBasedPattern.test(providedRollNumber);
      
      if (shouldRegenerate) {
        try {
          req.body.rollNumber = await generateRollNumber(newClass);
          console.log(`[UPDATE] Regenerated roll number for class change from ${existingStudent.class} to ${newClass}: ${req.body.rollNumber}`);
        } catch (error) {
          return res.status(400).json({
            success: false,
            message: error.message || 'Failed to generate roll number for new class'
          });
        }
      } else {
        // Roll number provided and matches format, but check uniqueness
        const duplicateStudent = await Student.findOne({ 
          rollNumber: providedRollNumber,
          class: newClass,
          _id: { $ne: req.params.id }
        });
        
        if (duplicateStudent) {
          // If duplicate, regenerate instead
          try {
            req.body.rollNumber = await generateRollNumber(newClass);
            console.log(`[UPDATE] Roll number ${providedRollNumber} already exists, regenerated: ${req.body.rollNumber}`);
          } catch (error) {
            return res.status(400).json({
              success: false,
              message: error.message || 'Failed to generate roll number for new class'
            });
          }
        }
      }
    }
    
    // Convert isActive string to boolean if present
    const studentData = {
      ...req.body,
      photo: req.file ? `http://localhost:9999/uploads/students/${req.file.filename}` : undefined
    };
    
    // Convert isActive from string to boolean
    if (studentData.isActive !== undefined && studentData.isActive !== null) {
      // Handle both string and boolean values
      if (typeof studentData.isActive === 'string') {
        studentData.isActive = studentData.isActive === 'true' || studentData.isActive === 'True';
      } else {
        studentData.isActive = Boolean(studentData.isActive);
      }
    } else {
      // Default to true if not provided
      studentData.isActive = true;
    }
    
    // Ensure parentName and parentPhone are strings (not undefined)
    if (studentData.parentName === undefined) studentData.parentName = '';
    if (studentData.parentPhone === undefined) studentData.parentPhone = '';
    
    // Log the student data for debugging
    console.log('Student data to update:', studentData);
    console.log('isActive after conversion:', studentData.isActive, 'Type:', typeof studentData.isActive);

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      studentData,
      { new: true, runValidators: true }
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    if (oldClass !== (student.class || '')) {
      await logEnrollmentHistory({
        student: student._id,
        action: 'class_change',
        fromClass: oldClass,
        toClass: student.class || '',
        fromAcademicYear: req.body.fromAcademicYear || '',
        toAcademicYear: req.body.academicYear || '',
        note: 'Student class updated',
        changedBy: req.user?._id,
        changedAt: new Date(),
      });
    }

    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    console.error('Error updating student:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = {};
      Object.keys(error.errors).forEach(key => {
        validationErrors[key] = error.errors[key].message;
      });
      
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationErrors
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `Duplicate value for ${field}`,
        error: error.message
      });
    }
    
    res.status(400).json({
      success: false,
      message: 'Error updating student',
      error: error.message
    });
  }
});

// Delete student
router.delete('/:id', protect, async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error deleting student',
      error: error.message
    });
  }
});

// Export students as CSV or Excel
router.get('/export', protect, async (req, res) => {
  try {
    const format = req.query.format || 'csv'; // csv or excel
    const students = await Student.find().lean();
    if (!students.length) {
      return res.status(404).json({ success: false, message: 'No students found' });
    }
    
    const fields = [
      'studentId', 'name', 'email', 'phone', 'address', 'dateOfBirth', 'gender', 'class', 'rollNumber',
      'parentName', 'parentPhone', 'admissionDate', 'isActive'
    ];
    
    if (format === 'excel' || format === 'xlsx') {
      // Export as Excel
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Students');
      
      // Define columns
      worksheet.columns = [
        { header: 'Tracking ID', key: 'studentId', width: 15 },
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Phone', key: 'phone', width: 15 },
        { header: 'Address', key: 'address', width: 40 },
        { header: 'Date of Birth', key: 'dateOfBirth', width: 15 },
        { header: 'Gender', key: 'gender', width: 10 },
        { header: 'Class', key: 'class', width: 10 },
        { header: 'Roll Number', key: 'rollNumber', width: 15 },
        { header: 'Parent Name', key: 'parentName', width: 25 },
        { header: 'Parent Phone', key: 'parentPhone', width: 15 },
        { header: 'Admission Date', key: 'admissionDate', width: 15 },
        { header: 'Status', key: 'isActive', width: 10 }
      ];
      
      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      
      // Add data rows
      students.forEach(student => {
        const row = {
          studentId: student.studentId || '',
          name: student.name || '',
          email: student.email || '',
          phone: student.phone || '',
          address: student.address || '',
          dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : '',
          gender: student.gender || '',
          class: student.class || '',
          rollNumber: student.rollNumber || '',
          parentName: student.parentName || '',
          parentPhone: student.parentPhone || '',
          admissionDate: student.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : '',
          isActive: student.isActive ? 'Active' : 'Inactive'
        };
        worksheet.addRow(row);
      });
      
      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=students.xlsx');
      
      // Write to response
      await workbook.xlsx.write(res);
      res.end();
    } else {
      // Export as CSV (default)
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=students.csv');
      fastcsv
        .write(students.map(s => {
          const obj = {};
          fields.forEach(f => {
            if (f === 'dateOfBirth' || f === 'admissionDate') {
              obj[f] = s[f] ? new Date(s[f]).toLocaleDateString() : '';
            } else if (f === 'isActive') {
              obj[f] = s[f] ? 'Active' : 'Inactive';
            } else {
              obj[f] = s[f] || '';
            }
          });
          return obj;
        }), { headers: true })
        .pipe(res);
    }
  } catch (error) {
    console.error('Error exporting students:', error);
    res.status(500).json({ success: false, message: 'Error exporting students', error: error.message });
  }
});

// Import students from CSV or Excel
router.post('/import', protect, multerExcel.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  
  const results = [];
  const fileExtension = path.extname(req.file.originalname).toLowerCase();
  
  try {
    if (fileExtension === '.xlsx' || fileExtension === '.xls') {
      // Import from Excel
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(req.file.path);
      
      const worksheet = workbook.getWorksheet(1); // Get first worksheet
      if (!worksheet) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, message: 'Excel file is empty or invalid' });
      }
      
      // Get headers from first row
      const headerRow = worksheet.getRow(1);
      const headers = [];
      headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        headers[colNumber] = cell.value.toString().toLowerCase().replace(/\s+/g, '');
      });
      
      // Read data rows
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row
        
        const rowData = {};
        row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
          const headerName = headers[colNumber];
          if (headerName) {
            rowData[headerName] = cell.value;
          }
        });
        
        if (Object.keys(rowData).length > 0) {
          results.push(rowData);
        }
      });
    } else {
      // Import from CSV
      await new Promise((resolve, reject) => {
        fs.createReadStream(req.file.path)
          .pipe(csvParser())
          .on('data', (data) => results.push(data))
          .on('end', resolve)
          .on('error', reject);
      });
    }
    
    if (results.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'No data found in file' });
    }
    
    // Process and import students
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (let i = 0; i < results.length; i++) {
      const row = results[i];
      try {
        // Normalize field names (handle variations)
        const studentData = {
          name: row.name || row['student name'] || '',
          email: row.email || row['email address'] || '',
          phone: row.phone || row['phone number'] || row.mobile || '',
          address: row.address || '',
          dateOfBirth: row.dateofbirth || row['date of birth'] || row.dob || null,
          gender: row.gender || '',
          class: row.class || row.classname || '',
          rollNumber: row.rollnumber || row['roll number'] || '',
          parentName: row.parentname || row['parent name'] || '',
          parentPhone: row.parentphone || row['parent phone'] || '',
          admissionDate: row.admissiondate || row['admission date'] || null,
          isActive: row.isactive !== undefined ? (row.isactive === 'true' || row.isactive === 'Active' || row.isactive === true) : true
        };
        
        // Validate required fields
        if (!studentData.name || !studentData.email || !studentData.class) {
          errorCount++;
          errors.push(`Row ${i + 2}: Missing required fields (name, email, or class)`);
          continue;
        }
        
        // Generate roll number if not provided or invalid format
        if (!studentData.rollNumber || !studentData.rollNumber.match(/^[A-Z0-9]+-\d+$/)) {
          try {
            studentData.rollNumber = await generateRollNumber(studentData.class);
          } catch (error) {
            errorCount++;
            errors.push(`Row ${i + 2}: Failed to generate roll number - ${error.message}`);
            continue;
          }
        }
        
        // Convert date strings to Date objects
        if (studentData.dateOfBirth && typeof studentData.dateOfBirth === 'string') {
          studentData.dateOfBirth = new Date(studentData.dateOfBirth);
        }
        if (studentData.admissionDate && typeof studentData.admissionDate === 'string') {
          studentData.admissionDate = new Date(studentData.admissionDate);
        }
        
        // Upsert by email or rollNumber
        await Student.findOneAndUpdate(
          { $or: [{ email: studentData.email }, { rollNumber: studentData.rollNumber }] },
          studentData,
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        
        successCount++;
      } catch (error) {
        errorCount++;
        errors.push(`Row ${i + 2}: ${error.message}`);
      }
    }
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    
    // Return response with summary
    res.json({
      success: true,
      message: `Import completed. ${successCount} student(s) imported successfully.`,
      summary: {
        total: results.length,
        success: successCount,
        errors: errorCount,
        errorDetails: errors.length > 0 ? errors.slice(0, 10) : [] // Limit to first 10 errors
      }
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Error importing students:', error);
    res.status(500).json({
      success: false,
      message: 'Error importing students',
      error: error.message
    });
  }
});

// Bulk update students (activate/deactivate/assign class)
router.post('/bulk-update', protect, async (req, res) => {
  try {
    const { ids, action, className } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No student IDs provided.' 
      });
    }

    let update = {};
    if (action === 'activate') {
      update.isActive = true;
    } else if (action === 'deactivate') {
      update.isActive = false;
    } else if (action === 'assignClass') {
      if (!className) {
        return res.status(400).json({ 
          success: false, 
          message: 'Class name is required for assignClass action.' 
        });
      }
      update.class = className;
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid action. Use "activate", "deactivate", or "assignClass".' 
      });
    }

    // If assigning to a class, we need to update each student individually
    // to regenerate roll numbers based on the new class
    if (action === 'assignClass') {
      console.log(`[BULK UPDATE] Assigning ${ids.length} students to class ${className}`);
      
      // Get all students that will be updated
      const students = await Student.find({ _id: { $in: ids } });
      
      let updatedCount = 0;
      const historyRows = [];
      for (const student of students) {
        const oldClass = student.class;
        const newClass = className;
        
        // Only regenerate if class is actually changing
        if (oldClass !== newClass) {
          // Check if current rollNumber matches new class format
          const escapedClassName = newClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const classBasedPattern = new RegExp(`^${escapedClassName}-\\d+$`);
          
          // If rollNumber doesn't match new class format, regenerate it
          if (!student.rollNumber || !classBasedPattern.test(student.rollNumber)) {
            try {
              // Generate new roll number for the new class
              const newRollNumber = await generateRollNumber(newClass);
              student.rollNumber = newRollNumber;
              console.log(`[BULK UPDATE] Regenerated roll number for student ${student.name}: ${newRollNumber}`);
            } catch (error) {
              console.error(`[BULK UPDATE] Error generating roll number for student ${student.name}:`, error);
              // Continue with other students even if one fails
            }
          }
        }
        
        // Update class and other fields
        student.class = newClass;
        if (update.isActive !== undefined) {
          student.isActive = update.isActive;
        }
        
        // Save the student (this will trigger pre-save hook as well)
        await student.save();
        updatedCount++;

        if (oldClass !== newClass) {
          historyRows.push({
            student: student._id,
            action: 'bulk_assign',
            fromClass: oldClass || '',
            toClass: newClass || '',
            fromAcademicYear: req.body.fromAcademicYear || '',
            toAcademicYear: req.body.academicYear || '',
            note: 'Bulk class assignment',
            changedBy: req.user?._id,
            changedAt: new Date(),
          });
        }
      }

      if (historyRows.length > 0) {
        try {
          await StudentEnrollmentHistory.insertMany(historyRows, { ordered: false });
        } catch (historyError) {
          console.error('Bulk update history insert warning:', historyError.message);
        }
      }
      
      res.json({ 
        success: true, 
        message: `Bulk update successful. ${updatedCount} student(s) updated.`,
        modifiedCount: updatedCount
      });
    } else {
      // For activate/deactivate, use updateMany (no roll number changes needed)
      const result = await Student.updateMany(
        { _id: { $in: ids } }, 
        { $set: update }
      );

      res.json({ 
        success: true, 
        message: `Bulk update successful. ${result.modifiedCount} student(s) updated.`,
        modifiedCount: result.modifiedCount
      });
    }
  } catch (error) {
    console.error('Error in bulk update:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Bulk update failed.', 
      error: error.message 
    });
  }
});

// Promote a class to next class/year without touching historical exam/result records
// This only updates Student.class (current placement) and writes promotion history entries.
router.post('/promote-class', protect, async (req, res) => {
  try {
    const {
      fromClass,
      toClass,
      toSection = '',
      fromAcademicYear = '',
      toAcademicYear = '',
      studentIds,
      includeInactive = false,
      dryRun = false,
    } = req.body;

    if (!toClass) {
      return res.status(400).json({
        success: false,
        message: 'toClass is required.',
      });
    }

    const hasStudentIds = Array.isArray(studentIds) && studentIds.length > 0;
    if (!hasStudentIds && !fromClass) {
      return res.status(400).json({
        success: false,
        message: 'fromClass is required when studentIds are not provided.',
      });
    }

    if (fromClass && String(fromClass).trim() === String(toClass).trim()) {
      return res.status(400).json({
        success: false,
        message: 'fromClass and toClass must be different.',
      });
    }

    const query = {};
    if (!includeInactive) query.isActive = true;
    if (fromClass) {
      query.class = String(fromClass).trim();
    }
    if (hasStudentIds) {
      query._id = { $in: studentIds };
    }

    const students = await Student.find(query);
    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No students found for promotion.',
      });
    }

    if (dryRun) {
      return res.json({
        success: true,
        dryRun: true,
        fromClass: fromClass || '',
        toClass,
        toSection,
        fromAcademicYear,
        toAcademicYear,
        candidateCount: students.length,
        candidates: students.slice(0, 50).map((s) => ({
          _id: s._id,
          name: s.name,
          rollNumber: s.rollNumber,
          class: s.class,
          section: s.section || '',
        })),
      });
    }

    const normalizedToClass = String(toClass).trim();
    const normalizedToSection = String(toSection || '').trim();
    const targetClassQuery = normalizedToSection
      ? { name: normalizedToClass, section: normalizedToSection }
      : { name: normalizedToClass };
    const targetClassDoc = await Class.findOne(targetClassQuery).select('_id name section').lean();

    let promotedCount = 0;
    let skippedCount = 0;
    const historyRows = [];
    const rollRegeneratedFor = [];

    for (const student of students) {
      const oldClass = student.class || '';
      const oldSection = student.section || '';
      const newClass = normalizedToClass;
      const newSection = targetClassDoc?.section || normalizedToSection || oldSection;

      if (oldClass === newClass && (!normalizedToSection || oldSection === newSection)) {
        skippedCount++;
        continue;
      }

      student.class = newClass;
      student.section = newSection || '';
      if (targetClassDoc?._id) {
        student.classRef = targetClassDoc._id;
      }

      // Keep roll number format aligned with current class. Regenerate only when needed.
      const escapedClassName = newClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const classBasedPattern = new RegExp(`^${escapedClassName}-\\d+$`);
      if (!student.rollNumber || !classBasedPattern.test(student.rollNumber)) {
        try {
          const newRollNumber = await generateRollNumber(newClass);
          student.rollNumber = newRollNumber;
          rollRegeneratedFor.push({
            studentId: student._id,
            name: student.name,
            newRollNumber,
          });
        } catch (error) {
          console.error(`[PROMOTION] Roll number regeneration failed for ${student.name}:`, error.message);
        }
      }

      await student.save();
      promotedCount++;

      historyRows.push({
        student: student._id,
        action: 'promotion',
        fromClass: oldClass,
        toClass: `${newClass}${newSection ? `-${newSection}` : ''}`,
        fromAcademicYear: String(fromAcademicYear || ''),
        toAcademicYear: String(toAcademicYear || ''),
        note: `Promoted from ${oldClass || 'N/A'}${oldSection ? `-${oldSection}` : ''} to ${newClass || 'N/A'}${newSection ? `-${newSection}` : ''}`,
        changedBy: req.user?._id,
        changedAt: new Date(),
      });
    }

    if (historyRows.length > 0) {
      try {
        await StudentEnrollmentHistory.insertMany(historyRows, { ordered: false });
      } catch (historyError) {
        console.error('Promotion history insert warning:', historyError.message);
      }
    }

    return res.json({
      success: true,
      message: `Promotion complete. ${promotedCount} promoted, ${skippedCount} skipped.`,
      summary: {
        fromClass,
        toClass,
        toSection: normalizedToSection,
        fromAcademicYear,
        toAcademicYear,
        totalMatched: students.length,
        promotedCount,
        skippedCount,
        historyWritten: historyRows.length,
        rollRegeneratedCount: rollRegeneratedFor.length,
      },
      rollRegeneratedFor,
    });
  } catch (error) {
    console.error('Error promoting class:', error);
    return res.status(500).json({
      success: false,
      message: 'Class promotion failed.',
      error: error.message,
    });
  }
});

// Bulk delete students
router.post('/bulk-delete', protect, async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No student IDs provided.' 
      });
    }

    const result = await Student.deleteMany({ _id: { $in: ids } });

    res.json({ 
      success: true, 
      message: `Bulk delete successful. ${result.deletedCount} student(s) deleted.`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error in bulk delete:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Bulk delete failed.', 
      error: error.message 
    });
  }
});

// Generate Student ID Card (Batch - with query parameter)
router.get('/id-card', protect, async (req, res) => {
  try {
    const { ids } = req.query; // For batch generation: ?ids=id1,id2,id3
    
    if (!ids) {
      return res.status(400).json({
        success: false,
        message: 'Student ID(s) required. Provide ?ids=id1,id2,id3 or use /id-card/:id for single student'
      });
    }
    
    const studentIds = ids.split(',').filter(id => id.trim());
    
    if (studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid student IDs provided'
      });
    }
    
    // Fetch students
    const students = await Student.find({ _id: { $in: studentIds } });
    
    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No students found'
      });
    }
    
    // Create PDF document - horizontal orientation
    const doc = new PDFDocument({
      size: [600, 380], // ID card size (8.33" x 5.28" in points) - horizontal
      margin: 0
    });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=student-id-cards.pdf`);
    
    // Pipe PDF to response
    doc.pipe(res);
    
    // Generate ID cards for each student
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      
      // Add new page for each card (except first)
      if (i > 0) {
        doc.addPage();
      }
      
      // Generate ID card using the new design
      await generateIDCardDesign(doc, student, uploadDir, path, fs, QRCode);
    }
    
    // Finalize PDF
    doc.end();
    
  } catch (error) {
    console.error('Error generating ID cards:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating ID cards',
      error: error.message
    });
  }
});

// Generate Student ID Card (Single student)
router.get('/id-card/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Student ID required'
      });
    }
    
    // Fetch student
    const student = await Student.findById(id);
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    // Create PDF document - horizontal orientation
    const doc = new PDFDocument({
      size: [600, 380], // ID card size (8.33" x 5.28" in points) - horizontal
      margin: 0
    });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=student-id-card.pdf`);
    
    // Pipe PDF to response
    doc.pipe(res);
    
    // Generate ID card using the new design
    await generateIDCardDesign(doc, student, uploadDir, path, fs, QRCode);
    
    // Finalize PDF
    doc.end();
    
  } catch (error) {
    console.error('Error generating ID card:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating ID card',
      error: error.message
    });
  }
});

// Get class/enrollment history for one student
router.get('/:id/enrollment-history', protect, async (req, res) => {
  try {
    const { id } = req.params;
    if (!require('mongoose').Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid student id' });
    }

    const history = await StudentEnrollmentHistory.find({ student: id })
      .sort({ changedAt: -1, createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error) {
    console.error('Get enrollment history error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error loading enrollment history',
      error: error.message,
    });
  }
});

// Get one student (after /export, /id-card, etc. so "export" is not matched as :id)
router.get('/:id', protect, async (req, res) => {
  try {
    if (!require('mongoose').Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid student id' });
    }
    const student = await Student.findById(req.params.id).lean();
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    res.json({ success: true, data: student });
  } catch (error) {
    console.error('Get student by id error:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading student',
      error: error.message
    });
  }
});

module.exports = router; 