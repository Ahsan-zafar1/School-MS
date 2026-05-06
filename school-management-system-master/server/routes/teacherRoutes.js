const express = require('express');
const router = express.Router();
const Teacher = require('../models/Teacher');
const { protect } = require('../middleware/auth');
const { createPortalUserForTeacher } = require('../helpers/createPortalUser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fastcsv = require('fast-csv');
const csvParser = require('csv-parser');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { searchRegexFromQuery, pickSortField, TEACHER_LIST_SORT } = require('../utils/queryHelpers');
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
const uploadDir = path.join(__dirname, '..', 'uploads', 'teachers');
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

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, 'teacher-' + Date.now() + path.extname(file.originalname));
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

// Helper function to delete photo
const deletePhoto = (photoPath) => {
  if (photoPath) {
    const fullPath = path.join(__dirname, '..', photoPath.replace(/^\//, ''));
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }
};

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

// Get all teachers with pagination, sorting, and filtering
router.get('/', protect, async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Sorting parameters
    const sortBy = pickSortField(req.query.sortBy, TEACHER_LIST_SORT, 'createdAt');
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortOrder };

    // Build filter query
    const filter = {};

    // Search filter (name, email, teacherId, subject)
    if (req.query.search) {
      const searchRegex = searchRegexFromQuery(req.query.search);
      if (searchRegex) {
        filter.$or = [
          { name: searchRegex },
          { email: searchRegex },
          { teacherId: searchRegex },
          { subject: searchRegex },
          { qualification: searchRegex }
        ];
      }
    }

    // Subject filter
    if (req.query.subject) {
      filter.subject = req.query.subject;
    }

    // Tracking ID filter
    if (req.query.trackingId) {
      const tr = searchRegexFromQuery(req.query.trackingId);
      if (tr) filter.teacherId = tr;
    }

    // Status filter
    if (req.query.status !== undefined && req.query.status !== '') {
      filter.isActive = req.query.status === 'true' || req.query.status === 'active';
    }

    // Gender filter
    if (req.query.gender) {
      filter.gender = req.query.gender;
    }

    // Date range filters (joining date)
    if (req.query.joiningDateFrom || req.query.joiningDateTo) {
      filter.joiningDate = {};
      if (req.query.joiningDateFrom) {
        filter.joiningDate.$gte = new Date(req.query.joiningDateFrom);
      }
      if (req.query.joiningDateTo) {
        filter.joiningDate.$lte = new Date(req.query.joiningDateTo);
      }
    }

    // Get total count for pagination
    const total = await Teacher.countDocuments(filter);

    // Calculate pagination info
    const totalPages = Math.max(1, Math.ceil(total / limit)); // Ensure at least 1 page
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    // Ensure page is within valid range
    const validPage = total > 0 ? Math.min(page, totalPages) : 1;
    const validSkip = (validPage - 1) * limit;

    // Fetch teachers with pagination
    const teachers = await Teacher.find(filter)
      .sort(sort)
      .skip(validSkip)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: teachers,
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
    console.error('Error fetching teachers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching teachers',
      error: error.message
    });
  }
});

// Export teachers as CSV or Excel (MUST be before /:id route)
router.get('/export', protect, async (req, res) => {
  try {
    const format = req.query.format || 'csv'; // csv or excel
    
    // Build query with optional filters
    const query = {};
    
    // Apply filters if provided
    if (req.query.search) {
      const searchRegex = searchRegexFromQuery(req.query.search);
      if (searchRegex) {
        query.$or = [
          { name: searchRegex },
          { email: searchRegex },
          { teacherId: searchRegex },
          { subject: searchRegex }
        ];
      }
    }
    
    if (req.query.subject) {
      query.subject = req.query.subject;
    }
    
    if (req.query.status !== undefined && req.query.status !== '') {
      query.isActive = req.query.status === 'true' || req.query.status === 'active';
    }
    
    const teachers = await Teacher.find(query).lean().sort({ createdAt: -1 });
    
    if (!teachers.length) {
      return res.status(404).json({ success: false, message: 'No teachers found to export' });
    }
    
    const fields = [
      'teacherId', 'name', 'email', 'phone', 'address', 'dateOfBirth', 'gender', 'qualification',
      'experience', 'subject', 'joiningDate', 'salary', 'isActive'
    ];
    
    if (format === 'excel' || format === 'xlsx') {
      // Export as Excel
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Teachers');
      
      // Define columns
      worksheet.columns = [
        { header: 'Tracking ID', key: 'teacherId', width: 15 },
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Phone', key: 'phone', width: 15 },
        { header: 'Address', key: 'address', width: 40 },
        { header: 'Date of Birth', key: 'dateOfBirth', width: 15 },
        { header: 'Gender', key: 'gender', width: 10 },
        { header: 'Qualification', key: 'qualification', width: 30 },
        { header: 'Experience (years)', key: 'experience', width: 15 },
        { header: 'Subject', key: 'subject', width: 20 },
        { header: 'Joining Date', key: 'joiningDate', width: 15 },
        { header: 'Salary', key: 'salary', width: 15 },
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
      teachers.forEach(teacher => {
        const row = {
          teacherId: teacher.teacherId || '',
          name: teacher.name || '',
          email: teacher.email || '',
          phone: teacher.phone || '',
          address: teacher.address || '',
          dateOfBirth: teacher.dateOfBirth ? new Date(teacher.dateOfBirth).toLocaleDateString() : '',
          gender: teacher.gender || '',
          qualification: teacher.qualification || '',
          experience: teacher.experience || 0,
          subject: teacher.subject || '',
          joiningDate: teacher.joiningDate ? new Date(teacher.joiningDate).toLocaleDateString() : '',
          salary: teacher.salary || 0,
          isActive: teacher.isActive ? 'Active' : 'Inactive'
        };
        worksheet.addRow(row);
      });
      
      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=teachers.xlsx');
      
      // Write to response
      await workbook.xlsx.write(res);
      res.end();
    } else {
      // Export as CSV (default)
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=teachers-${new Date().toISOString().split('T')[0]}.csv`);
      
      // Add BOM for Excel UTF-8 compatibility
      res.write('\ufeff');
      
      fastcsv
        .write(teachers.map(t => {
          const obj = {};
          fields.forEach(f => {
            if (f === 'dateOfBirth' || f === 'joiningDate') {
              obj[f] = t[f] 
                ? new Date(t[f]).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
                : '';
            } else if (f === 'isActive') {
              obj[f] = t[f] ? 'Active' : 'Inactive';
            } else if (f === 'gender' && t[f]) {
              obj[f] = t[f].charAt(0).toUpperCase() + t[f].slice(1);
            } else {
              obj[f] = t[f] || '';
            }
          });
          return obj;
        }), { 
          headers: true,
          includeEndRowDelimiter: true
        })
        .pipe(res);
    }
  } catch (error) {
    console.error('Error exporting teachers:', error);
    console.error('Error stack:', error.stack);
    
    // If headers already sent, we can't send JSON response
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        message: 'Error exporting teachers', 
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } else {
      // If headers sent, try to end the response
      try {
        res.end();
      } catch (e) {
        console.error('Error ending response:', e);
      }
    }
  }
});

// Export teachers as CSV or Excel (MUST be before /:id route to avoid route conflict)
router.get('/export', protect, async (req, res) => {
  try {
    const format = req.query.format || 'csv'; // csv or excel
    
    // Build query with optional filters
    const query = {};
    
    // Apply filters if provided
    if (req.query.search) {
      const searchRegex = searchRegexFromQuery(req.query.search);
      if (searchRegex) {
        query.$or = [
          { name: searchRegex },
          { email: searchRegex },
          { teacherId: searchRegex },
          { subject: searchRegex }
        ];
      }
    }
    
    if (req.query.subject) {
      query.subject = req.query.subject;
    }
    
    if (req.query.status !== undefined && req.query.status !== '') {
      query.isActive = req.query.status === 'true' || req.query.status === 'active';
    }
    
    const teachers = await Teacher.find(query).lean().sort({ createdAt: -1 });
    
    if (!teachers.length) {
      return res.status(404).json({ success: false, message: 'No teachers found to export' });
    }
    
    const fields = [
      'teacherId', 'name', 'email', 'phone', 'address', 'dateOfBirth', 'gender', 'qualification',
      'experience', 'subject', 'joiningDate', 'salary', 'isActive'
    ];
    
    if (format === 'excel' || format === 'xlsx') {
      // Export as Excel
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Teachers');
      
      // Define columns
      worksheet.columns = [
        { header: 'Tracking ID', key: 'teacherId', width: 15 },
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Phone', key: 'phone', width: 15 },
        { header: 'Address', key: 'address', width: 40 },
        { header: 'Date of Birth', key: 'dateOfBirth', width: 15 },
        { header: 'Gender', key: 'gender', width: 10 },
        { header: 'Qualification', key: 'qualification', width: 30 },
        { header: 'Experience (years)', key: 'experience', width: 15 },
        { header: 'Subject', key: 'subject', width: 20 },
        { header: 'Joining Date', key: 'joiningDate', width: 15 },
        { header: 'Salary', key: 'salary', width: 15 },
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
      teachers.forEach(teacher => {
        const row = {
          teacherId: teacher.teacherId || '',
          name: teacher.name || '',
          email: teacher.email || '',
          phone: teacher.phone || '',
          address: teacher.address || '',
          dateOfBirth: teacher.dateOfBirth ? new Date(teacher.dateOfBirth).toLocaleDateString() : '',
          gender: teacher.gender || '',
          qualification: teacher.qualification || '',
          experience: teacher.experience || 0,
          subject: teacher.subject || '',
          joiningDate: teacher.joiningDate ? new Date(teacher.joiningDate).toLocaleDateString() : '',
          salary: teacher.salary || 0,
          isActive: teacher.isActive ? 'Active' : 'Inactive'
        };
        worksheet.addRow(row);
      });
      
      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=teachers.xlsx');
      
      // Write to response
      await workbook.xlsx.write(res);
      res.end();
    } else {
      // Export as CSV (default)
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=teachers-${new Date().toISOString().split('T')[0]}.csv`);
      
      // Add BOM for Excel UTF-8 compatibility
      res.write('\ufeff');
      
      fastcsv
        .write(teachers.map(t => {
          const obj = {};
          fields.forEach(f => {
            if (f === 'dateOfBirth' || f === 'joiningDate') {
              obj[f] = t[f] 
                ? new Date(t[f]).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
                : '';
            } else if (f === 'isActive') {
              obj[f] = t[f] ? 'Active' : 'Inactive';
            } else if (f === 'gender' && t[f]) {
              obj[f] = t[f].charAt(0).toUpperCase() + t[f].slice(1);
            } else {
              obj[f] = t[f] || '';
            }
          });
          return obj;
        }), { 
          headers: true,
          includeEndRowDelimiter: true
        })
        .pipe(res);
    }
  } catch (error) {
    console.error('Error exporting teachers:', error);
    console.error('Error stack:', error.stack);
    
    // If headers already sent, we can't send JSON response
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        message: 'Error exporting teachers', 
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } else {
      // If headers sent, try to end the response
      try {
        res.end();
      } catch (e) {
        console.error('Error ending response:', e);
      }
    }
  }
});

// Get single teacher
router.get('/:id', protect, async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }
    res.json({
      success: true,
      data: teacher
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching teacher',
      error: error.message
    });
  }
});

// Create teacher with file upload
router.post('/', protect, upload.single('photo'), handleMulterError, async (req, res) => {
  try {
    console.log('Request body:', req.body);
    
    const teacherData = {
      ...req.body,
      photo: req.file ? `http://localhost:9999/uploads/teachers/${req.file.filename}` : undefined
    };

    // Convert isActive from string to boolean
    if (teacherData.isActive !== undefined && teacherData.isActive !== null) {
      if (typeof teacherData.isActive === 'string') {
        teacherData.isActive = teacherData.isActive === 'true' || teacherData.isActive === 'True';
      } else {
        teacherData.isActive = Boolean(teacherData.isActive);
      }
    } else {
      teacherData.isActive = true; // Default to true if not provided
    }

    // Convert experience to number if string
    if (teacherData.experience && typeof teacherData.experience === 'string') {
      teacherData.experience = parseInt(teacherData.experience) || 0;
    }

    // Convert salary to number if string
    if (teacherData.salary && typeof teacherData.salary === 'string') {
      teacherData.salary = parseFloat(teacherData.salary) || 0;
    }

    console.log('Teacher data to create:', teacherData);

    const teacher = await Teacher.create(teacherData);

    // Auto-create portal login user for this teacher (email or username = teacherId)
    const portalResult = await createPortalUserForTeacher(teacher);
    if (portalResult.created) {
      console.log('Portal user created for teacher:', teacher.name, '| Login:', teacher.email || teacher.teacherId);
    } else {
      console.log('Portal user for teacher:', teacher.name, '—', portalResult.message);
    }

    res.status(201).json({
      success: true,
      data: teacher,
      portalUserCreated: portalResult.created,
      portalLogin: portalResult.created ? (teacher.email || teacher.teacherId) : undefined
    });
  } catch (error) {
    // If there's an error, delete the uploaded file if it exists
    if (req.file) {
      deletePhoto(`/uploads/teachers/${req.file.filename}`);
    }
    
    console.error('Error creating teacher:', error);
    
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
      message: 'Error creating teacher',
      error: error.message
    });
  }
});

// Create portal login user for an existing teacher (e.g. added before auto-create was enabled)
router.post('/:id/create-portal-user', protect, async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id).lean();
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }
    const result = await createPortalUserForTeacher(teacher);
    if (result.created) {
      return res.status(201).json({
        success: true,
        message: result.message,
        login: teacher.email || teacher.teacherId,
        password: 'teacher123'
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

// Update teacher with file upload
router.put('/:id', protect, upload.single('photo'), handleMulterError, async (req, res) => {
  try {
    console.log('Request body:', req.body);

    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    const teacherData = {
      ...req.body,
      photo: req.file ? `http://localhost:9999/uploads/teachers/${req.file.filename}` : undefined
    };

    if (req.file) {
      // Delete old photo if it exists
      if (teacher.photo) {
        deletePhoto(teacher.photo);
      }
    }

    // Convert isActive from string to boolean
    if (teacherData.isActive !== undefined && teacherData.isActive !== null) {
      if (typeof teacherData.isActive === 'string') {
        teacherData.isActive = teacherData.isActive === 'true' || teacherData.isActive === 'True';
      } else {
        teacherData.isActive = Boolean(teacherData.isActive);
      }
    }

    // Convert experience to number if string
    if (teacherData.experience && typeof teacherData.experience === 'string') {
      teacherData.experience = parseInt(teacherData.experience) || 0;
    }

    // Convert salary to number if string
    if (teacherData.salary && typeof teacherData.salary === 'string') {
      teacherData.salary = parseFloat(teacherData.salary) || 0;
    }

    console.log('Teacher data to update:', teacherData);

    const updatedTeacher = await Teacher.findByIdAndUpdate(
      req.params.id,
      teacherData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: updatedTeacher
    });
  } catch (error) {
    // If there's an error, delete the uploaded file if it exists
    if (req.file) {
      deletePhoto(`/uploads/teachers/${req.file.filename}`);
    }
    
    console.error('Error updating teacher:', error);
    
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
      message: 'Error updating teacher',
      error: error.message
    });
  }
});

// Delete teacher
router.delete('/:id', protect, async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Delete photo if it exists
    if (teacher.photo) {
      deletePhoto(teacher.photo);
    }

    // Use findByIdAndDelete instead of remove()
    await Teacher.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Teacher deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting teacher:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting teacher',
      error: error.message
    });
  }
});

// Import teachers from CSV or Excel
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
      
      // Handle .xls files (older format) - ExcelJS can read both
      if (fileExtension === '.xls') {
        // For .xls files, we need to use a different approach or convert
        // ExcelJS should handle it, but if not, we'll need xlsx library
        console.log('Attempting to read .xls file with ExcelJS...');
      }
      
      await workbook.xlsx.readFile(req.file.path);
      
      const worksheet = workbook.getWorksheet(1); // Get first worksheet
      if (!worksheet) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, message: 'Excel file is empty or invalid' });
      }
      
      // Get headers from first row - normalize them
      const headerRow = worksheet.getRow(1);
      const headers = {};
      headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const headerValue = cell.value ? cell.value.toString().trim() : '';
        // Normalize header name (lowercase, remove spaces, handle common variations)
        const normalized = headerValue.toLowerCase()
          .replace(/\s+/g, '')
          .replace(/[^a-z0-9]/g, '');
        headers[colNumber] = normalized;
      });
      
      // Read data rows
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row
        
        const rowData = {};
        row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
          const headerName = headers[colNumber];
          if (headerName) {
            // Get cell value, handling different types
            let cellValue = cell.value;
            if (cellValue !== null && cellValue !== undefined) {
              // Handle Excel date values
              if (cell.type === ExcelJS.ValueType.Date || cellValue instanceof Date) {
                cellValue = cellValue.toISOString().split('T')[0]; // Format as YYYY-MM-DD
              } else if (typeof cellValue === 'object' && cellValue.text) {
                // Rich text
                cellValue = cellValue.text;
              } else {
                cellValue = cellValue.toString().trim();
              }
            } else {
              cellValue = '';
            }
            rowData[headerName] = cellValue;
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
          .on('data', (data) => {
            // Normalize CSV data keys (lowercase, remove spaces)
            const normalizedData = {};
            Object.keys(data).forEach(key => {
              const normalized = key.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
              normalizedData[normalized] = data[key] ? data[key].trim() : '';
            });
            results.push(normalizedData);
          })
          .on('end', resolve)
          .on('error', reject);
      });
    }
    
    if (results.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'No data found in file' });
    }
    
    // Process and import teachers
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (let i = 0; i < results.length; i++) {
      const row = results[i];
      try {
        // Normalize field names - handle multiple variations
        const teacherData = {
          name: row.name || row.teachername || row.fullname || '',
          email: row.email || row.emailaddress || row['emailaddress'] || '',
          phone: row.phone || row.phonenumber || row.mobile || row.contact || '',
          address: row.address || row.location || '',
          dateOfBirth: row.dateofbirth || row.dob || row.birthdate || row['dateofbirth'] || null,
          gender: (row.gender || '').toLowerCase(),
          qualification: row.qualification || row.qual || row.education || '',
          experience: row.experience ? parseInt(row.experience) || 0 : 0,
          subject: row.subject || row.subjects || row.teachingsubject || '',
          joiningDate: row.joiningdate || row.joindate || row['joiningdate'] || row.startdate || null,
          salary: row.salary ? parseFloat(row.salary) || 0 : 0,
          isActive: row.isactive !== undefined && row.isactive !== null 
            ? (row.isactive === 'true' || row.isactive === 'True' || row.isactive === 'Active' || row.isactive === true || row.isactive === 1) 
            : true
        };
        
        // Validate required fields
        if (!teacherData.name || !teacherData.email) {
          errorCount++;
          errors.push(`Row ${i + 2}: Missing required fields (name or email)`);
          continue;
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(teacherData.email)) {
          errorCount++;
          errors.push(`Row ${i + 2}: Invalid email format: ${teacherData.email}`);
          continue;
        }
        
        // Convert date strings to Date objects
        if (teacherData.dateOfBirth && typeof teacherData.dateOfBirth === 'string') {
          const dobDate = new Date(teacherData.dateOfBirth);
          if (isNaN(dobDate.getTime())) {
            errorCount++;
            errors.push(`Row ${i + 2}: Invalid date of birth format: ${teacherData.dateOfBirth}`);
            continue;
          }
          teacherData.dateOfBirth = dobDate;
        }
        
        if (teacherData.joiningDate && typeof teacherData.joiningDate === 'string') {
          const joinDate = new Date(teacherData.joiningDate);
          if (isNaN(joinDate.getTime())) {
            errorCount++;
            errors.push(`Row ${i + 2}: Invalid joining date format: ${teacherData.joiningDate}`);
            continue;
          }
          teacherData.joiningDate = joinDate;
        }
        
        // Validate gender
        if (teacherData.gender && !['male', 'female', 'other'].includes(teacherData.gender)) {
          teacherData.gender = ''; // Set to empty if invalid
        }
        
        // Upsert by email (update if exists, create if new)
        await Teacher.findOneAndUpdate(
          { email: teacherData.email.toLowerCase() },
          teacherData,
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        
        successCount++;
      } catch (error) {
        errorCount++;
        const errorMsg = error.message || 'Unknown error';
        errors.push(`Row ${i + 2}: ${errorMsg}`);
        console.error(`Error importing row ${i + 2}:`, error);
      }
    }
    
    // Clean up uploaded file
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    // Return response with summary
    res.json({
      success: true,
      message: `Import completed. ${successCount} teacher(s) imported successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}.`,
      summary: {
        total: results.length,
        success: successCount,
        errors: errorCount,
        errorDetails: errors.length > 0 ? errors.slice(0, 20) : [] // Limit to first 20 errors
      }
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Error importing teachers:', error);
    res.status(500).json({
      success: false,
      message: 'Error importing teachers',
      error: error.message
    });
  }
});

// Bulk update teachers (activate/deactivate)
router.post('/bulk-update', protect, async (req, res) => {
  try {
    const { ids, action } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No teacher IDs provided.' 
      });
    }

    let update = {};
    if (action === 'activate') {
      update.isActive = true;
    } else if (action === 'deactivate') {
      update.isActive = false;
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid action. Use "activate" or "deactivate".' 
      });
    }

    const result = await Teacher.updateMany(
      { _id: { $in: ids } },
      { $set: update }
    );

    res.json({ 
      success: true, 
      message: `Bulk update successful. ${result.modifiedCount} teacher(s) updated.`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error in bulk update:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Bulk update failed.', 
      error: error.message 
    });
  }
});

// Bulk delete teachers
router.post('/bulk-delete', protect, async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No teacher IDs provided.' 
      });
    }

    // Get teachers to delete their photos
    const teachers = await Teacher.find({ _id: { $in: ids } });
    teachers.forEach(teacher => {
      if (teacher.photo) {
        deletePhoto(teacher.photo);
      }
    });

    const result = await Teacher.deleteMany({ _id: { $in: ids } });

    res.json({ 
      success: true, 
      message: `Bulk delete successful. ${result.deletedCount} teacher(s) deleted.`,
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

// Helper function to generate teacher ID card PDF
const generateTeacherIdCardPdf = async (doc, teacher, uploadDir, path, fs, QRCode) => {
  const cardWidth = 600;
  const cardHeight = 380;
  const margin = 20;
  const contentWidth = cardWidth - 2 * margin;
  
  // Background: White card with rounded corners
  doc.roundedRect(0, 0, cardWidth, cardHeight, 15)
    .fillColor('#FFFFFF')
    .fill();
  
  // Top wave-like graphic elements
  const waveHeight = 100;
  const waveOffset = 20;
  
  // Dark Blue Wave (bottom layer)
  doc.save()
    .translate(0, 0)
    .path(`M0,${waveHeight - waveOffset} C${cardWidth / 4},${waveHeight + waveOffset} ${cardWidth * 3 / 4},${waveHeight - waveOffset} ${cardWidth},${waveHeight - waveOffset}`)
    .lineTo(cardWidth, 0)
    .lineTo(0, 0)
    .fill('#1e3a8a')
    .restore();
  
  // Light Blue Wave (middle layer)
  doc.save()
    .translate(0, 0)
    .path(`M0,${waveHeight - waveOffset - 10} C${cardWidth / 4},${waveHeight + waveOffset - 10} ${cardWidth * 3 / 4},${waveHeight - waveOffset - 10} ${cardWidth},${waveHeight - waveOffset - 10}`)
    .lineTo(cardWidth, 0)
    .lineTo(0, 0)
    .fill('#3b82f6')
    .restore();
  
  // Golden Yellow Wave (top layer)
  doc.save()
    .translate(0, 0)
    .path(`M0,${waveHeight - waveOffset - 20} C${cardWidth / 4},${waveHeight + waveOffset - 20} ${cardWidth * 3 / 4},${waveHeight - waveOffset - 20} ${cardWidth},${waveHeight - waveOffset - 20}`)
    .lineTo(cardWidth, 0)
    .lineTo(0, 0)
    .fill('#f59e0b')
    .restore();
  
  // School Logo and Name
  const logoSize = 40;
  const logoX = margin + 10;
  const logoY = margin + 5;
  
  doc.fillColor('#FFFFFF')
    .fontSize(30)
    .font('Helvetica-Bold')
    .text('🎓', logoX, logoY);
  
  doc.fillColor('#FFFFFF')
    .fontSize(14)
    .font('Helvetica-Bold')
    .text('School Management System', logoX + logoSize + 5, logoY + 5);
  
  doc.fontSize(8)
    .font('Helvetica')
    .text('123 Anywhere St., Any City, ST 12345', logoX + logoSize + 5, logoY + 25);
  
  // Teacher Name Bar (Golden Yellow)
  const nameBarHeight = 30;
  const nameBarY = waveHeight + 10;
  doc.rect(margin, nameBarY, contentWidth, nameBarHeight)
    .fillColor('#f59e0b')
    .fill();
  
  doc.fillColor('#000000')
    .fontSize(18)
    .font('Helvetica-Bold')
    .text(teacher.name.toUpperCase(), margin, nameBarY + 7, {
      align: 'center',
      width: contentWidth
    });
  
  // Teacher Details (Left Section)
  const detailsX = margin;
  let detailsY = nameBarY + nameBarHeight + 20;
  const detailLineHeight = 18;
  
  doc.fillColor('#000000')
    .fontSize(10)
    .font('Helvetica-Bold');
  
  const addDetail = (label, value) => {
    doc.text(`${label}:`, detailsX, detailsY);
    doc.font('Helvetica').text(value || 'N/A', detailsX + 80, detailsY);
    detailsY += detailLineHeight;
  };
  
  addDetail('Teacher ID', teacher.teacherId);
  addDetail('Subject', teacher.subject);
  addDetail('Qualification', teacher.qualification);
  addDetail('Experience', `${teacher.experience || 0} years`);
  addDetail('Email', teacher.email);
  
  // Teacher Photo (Right Section)
  const photoSize = 100;
  const photoX = cardWidth - margin - photoSize - 10;
  const photoY = nameBarY + nameBarHeight + 10;
  
  // Photo border (Dark Blue)
  doc.circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2 + 5)
    .fillColor('#1e3a8a')
    .fill();
  
  let photoLoaded = false;
  if (teacher.photo) {
    try {
      let photoFilename = teacher.photo;
      if (photoFilename.includes('uploads/teachers/')) {
        photoFilename = photoFilename.split('uploads/teachers/')[1];
      } else if (photoFilename.startsWith('http://localhost:9999/')) {
        photoFilename = photoFilename.replace('http://localhost:9999/uploads/teachers/', '');
      }
      
      const photoPath = path.join(uploadDir, photoFilename);
      
      if (fs.existsSync(photoPath)) {
        doc.image(photoPath, photoX + 5, photoY + 5, {
          width: photoSize,
          height: photoSize,
          fit: [photoSize, photoSize],
          align: 'center'
        });
        photoLoaded = true;
      }
    } catch (error) {
      console.error('Error loading photo for ID card:', error);
      photoLoaded = false;
    }
  }
  
  // If photo not loaded, show placeholder
  if (!photoLoaded) {
    doc.circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2)
      .fillColor('#dbeafe')
      .fill();
    
    doc.fillColor('#1e3a8a')
      .fontSize(40)
      .font('Helvetica-Bold')
      .text(teacher.name.charAt(0).toUpperCase(), photoX + photoSize / 2 - 15, photoY + photoSize / 2 - 20, {
        align: 'center',
        width: photoSize
      });
  }
  
  // QR Code (Bottom Right)
  const qrSize = 80;
  const qrX = cardWidth - margin - qrSize;
  const qrY = cardHeight - margin - qrSize;
  
  const qrData = JSON.stringify({
    teacherId: teacher.teacherId,
    name: teacher.name,
    subject: teacher.subject,
    email: teacher.email
  });
  
  let qrCodeDataUrl;
  try {
    qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      width: qrSize,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
    const qrBuffer = Buffer.from(base64Data, 'base64');
    doc.image(qrBuffer, qrX, qrY, {
      width: qrSize,
      height: qrSize
    });
  } catch (error) {
    console.error('Error generating QR code for ID card:', error);
  }
};

// Generate teacher ID card(s) - batch or single
router.get('/id-card', protect, async (req, res) => {
  try {
    const ids = req.query.ids;
    if (!ids) {
      return res.status(400).json({ success: false, message: 'No teacher IDs provided' });
    }
    
    const teacherIds = ids.split(',').map(id => id.trim());
    const teachers = await Teacher.find({ _id: { $in: teacherIds } }).lean();
    
    if (teachers.length === 0) {
      return res.status(404).json({ success: false, message: 'No teachers found' });
    }
    
    const doc = new PDFDocument({ size: [600, 380], margin: 0 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=teacher-id-cards.pdf');
    doc.pipe(res);
    
    for (let i = 0; i < teachers.length; i++) {
      if (i > 0) doc.addPage();
      await generateTeacherIdCardPdf(doc, teachers[i], uploadDir, path, fs, QRCode);
    }
    
    doc.end();
  } catch (error) {
    console.error('Error generating teacher ID cards:', error);
    res.status(500).json({ success: false, message: 'Error generating ID cards', error: error.message });
  }
});

// Generate single teacher ID card
router.get('/id-card/:id', protect, async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id).lean();
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }
    
    const doc = new PDFDocument({ size: [600, 380], margin: 0 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=teacher-id-card.pdf');
    doc.pipe(res);
    
    await generateTeacherIdCardPdf(doc, teacher, uploadDir, path, fs, QRCode);
    doc.end();
  } catch (error) {
    console.error('Error generating teacher ID card:', error);
    res.status(500).json({ success: false, message: 'Error generating ID card', error: error.message });
  }
});

module.exports = router; 