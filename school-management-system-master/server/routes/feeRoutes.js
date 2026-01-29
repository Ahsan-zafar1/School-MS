const express = require('express');
const router = express.Router();
const Fee = require('../models/Fee');
const Student = require('../models/Student');
const { protect } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fastcsv = require('fast-csv');
const csvParser = require('csv-parser');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// Ensure tmp directories exist
const tmpCsvDir = path.join(__dirname, '..', 'tmp', 'csv');
const tmpExcelDir = path.join(__dirname, '..', 'tmp', 'excel');
if (!fs.existsSync(tmpCsvDir)) {
  fs.mkdirSync(tmpCsvDir, { recursive: true });
}
if (!fs.existsSync(tmpExcelDir)) {
  fs.mkdirSync(tmpExcelDir, { recursive: true });
}

const multerCsv = multer({ dest: tmpCsvDir });
const multerExcel = multer({ 
  dest: tmpExcelDir,
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel (.xlsx, .xls) and CSV files are allowed.'));
    }
  }
});

// Protect all routes
router.use(protect);

// Currency list
const CURRENCIES = [
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' }
];

// Fee types
const FEE_TYPES = ['Tuition', 'Library', 'Laboratory', 'Sports', 'Examination', 'Transport', 'Hostel', 'Other'];

// Get all fees with pagination, sorting, and filtering
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortOrder };
    
    // Build filter
    let filter = {};
    const andConditions = [];
    
    // Search filter - includes student fields
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      
      // First, find students matching the search term (name, studentId, rollNumber)
      const matchingStudents = await Student.find({
        $or: [
          { name: searchRegex },
          { studentId: searchRegex },
          { rollNumber: searchRegex }
        ]
      }).select('_id').lean();
      
      const studentIds = matchingStudents.map(s => s._id);
      
      // Build search conditions
      const searchConditions = [
        { feeId: searchRegex },
        { description: searchRegex },
        { transactionId: searchRegex }
      ];
      
      // If we found matching students, add student ID search
      if (studentIds.length > 0) {
        searchConditions.push({ student: { $in: studentIds } });
      }
      
      andConditions.push({
        $or: searchConditions
      });
    }
    
    // Specific filters
    if (req.query.student) filter.student = req.query.student;
    if (req.query.class) filter.class = req.query.class;
    if (req.query.feeType) filter.feeType = req.query.feeType;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.currency) filter.currency = req.query.currency;
    // Academic Year filter - must match exactly, handle null/empty cases
    if (req.query.academicYear) {
      const academicYear = req.query.academicYear.trim();
      // Only show fees with the exact academicYear (exclude null/empty/undefined)
      andConditions.push({
        $and: [
          { academicYear: { $exists: true } },
          { academicYear: { $ne: null } },
          { academicYear: { $ne: '' } },
          { academicYear: academicYear }
        ]
      });
    }
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }
    
    // Date range filters
    if (req.query.dueDateFrom || req.query.dueDateTo) {
      filter.dueDate = {};
      if (req.query.dueDateFrom) {
        filter.dueDate.$gte = new Date(req.query.dueDateFrom);
      }
      if (req.query.dueDateTo) {
        filter.dueDate.$lte = new Date(req.query.dueDateTo);
      }
    }
    
    // Amount range filters
    if (req.query.amountMin || req.query.amountMax) {
      filter.amount = {};
      if (req.query.amountMin) {
        filter.amount.$gte = parseFloat(req.query.amountMin);
      }
      if (req.query.amountMax) {
        filter.amount.$lte = parseFloat(req.query.amountMax);
      }
    }
    
    // Combine conditions
    if (andConditions.length > 0) {
      filter = { $and: [filter, ...andConditions] };
    }
    
    // Get total count
    const total = await Fee.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    // Fetch fees with pagination
    const fees = await Fee.find(filter)
      .populate('student', 'name rollNumber studentId email phone class')
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
    
    res.json({
      success: true,
      data: fees,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error) {
    console.error('Error fetching fees:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get fees grouped by month (MUST come before /:id route)
router.get('/grouped-by-month', protect, async (req, res) => {
  try {
    let filter = {};
    const andConditions = [];
    
    // Search filter - includes student fields
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      
      // First, find students matching the search term (name, studentId, rollNumber)
      const matchingStudents = await Student.find({
        $or: [
          { name: searchRegex },
          { studentId: searchRegex },
          { rollNumber: searchRegex }
        ]
      }).select('_id').lean();
      
      const studentIds = matchingStudents.map(s => s._id);
      
      // Build search conditions
      const searchConditions = [
        { feeId: searchRegex },
        { description: searchRegex },
        { transactionId: searchRegex }
      ];
      
      // If we found matching students, add student ID search
      if (studentIds.length > 0) {
        searchConditions.push({ student: { $in: studentIds } });
      }
      
      andConditions.push({
        $or: searchConditions
      });
    }
    
    if (req.query.class) filter.class = req.query.class;
    if (req.query.academicYear) filter.academicYear = req.query.academicYear;
    if (req.query.feeType) filter.feeType = req.query.feeType;
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }
    
    // Combine conditions
    if (andConditions.length > 0) {
      filter = { $and: [filter, ...andConditions] };
    }
    
    const fees = await Fee.find(filter)
      .populate('student', 'name rollNumber studentId class')
      .sort({ month: -1, createdAt: -1 })
      .lean();
    
    // Group fees by month
    const groupedByMonth = {};
    
    fees.forEach(fee => {
      const month = fee.month || 'Unknown';
      if (!groupedByMonth[month]) {
        groupedByMonth[month] = [];
      }
      groupedByMonth[month].push(fee);
    });
    
    // Convert to array format with statistics
    const groupedArray = Object.entries(groupedByMonth).map(([month, monthFees]) => {
      const totalAmount = monthFees.reduce((sum, fee) => sum + (fee.amount || 0), 0);
      const paidAmount = monthFees
        .filter(fee => fee.status === 'Paid')
        .reduce((sum, fee) => sum + (fee.amount || 0), 0);
      const pendingAmount = monthFees
        .filter(fee => fee.status === 'Pending')
        .reduce((sum, fee) => sum + (fee.amount || 0), 0);
      const overdueAmount = monthFees
        .filter(fee => fee.status === 'Overdue')
        .reduce((sum, fee) => sum + (fee.amount || 0), 0);
      
      return {
        month,
        year: month.split('-')[0],
        monthNumber: parseInt(month.split('-')[1]),
        monthName: new Date(`${month}-01`).toLocaleString('default', { month: 'long' }),
        totalFees: monthFees.length,
        totalAmount,
        paidAmount,
        pendingAmount,
        overdueAmount,
        fees: monthFees
      };
    });
    
    // Sort by month (newest first)
    groupedArray.sort((a, b) => {
      if (a.year !== b.year) return parseInt(b.year) - parseInt(a.year);
      return b.monthNumber - a.monthNumber;
    });
    
    res.json({
      success: true,
      data: groupedArray
    });
  } catch (error) {
    console.error('Error grouping fees by month:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Auto-create fees for a class (bulk creation) - MUST come before /:id route
router.post('/auto-create', protect, async (req, res) => {
  try {
    const { class: className, feeType, amount, currency, dueDate, academicYear, description } = req.body;
    
    if (!className || !feeType || !amount || !dueDate) {
      return res.status(400).json({
        success: false,
        message: 'Class, fee type, amount, and due date are required'
      });
    }
    
    // Find all active students in the class
    const students = await Student.find({
      class: className,
      isActive: true
    }).lean();
    
    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No active students found in class ${className}`
      });
    }
    
    const dueDateObj = new Date(dueDate);
    const month = `${dueDateObj.getFullYear()}-${String(dueDateObj.getMonth() + 1).padStart(2, '0')}`;
    
    const createdFees = [];
    const skippedFees = [];
    const errors = [];
    
    for (const student of students) {
      try {
        // Check if fee already exists
        const existingFee = await Fee.findOne({
          student: student._id,
          feeType: feeType,
          month: month
        });
        
        if (existingFee) {
          skippedFees.push({
            student: student.name,
            reason: 'Fee already exists for this month'
          });
          continue;
        }
        
        // Create fee with explicit month field
        const feeData = {
          student: student._id,
          class: student.class || className,
          academicYear: academicYear || new Date().getFullYear().toString(),
          amount: Number(amount),
          currency: currency || 'PKR',
          feeType: feeType,
          dueDate: dueDateObj,
          month: month, // Set month explicitly to ensure it's saved
          status: 'Pending',
          description: description || '',
          isActive: true,
          createdBy: req.user._id
        };
        
        const fee = await Fee.create(feeData);
        
        const populatedFee = await Fee.findById(fee._id)
          .populate('student', 'name rollNumber studentId class')
          .populate('createdBy', 'name');
        
        createdFees.push(populatedFee);
      } catch (error) {
        console.error(`Error creating fee for student ${student.name || student._id}:`, error);
        errors.push({
          student: student.name || student._id.toString(),
          error: error.message || 'Unknown error'
        });
      }
    }
    
    console.log(`Bulk create complete: Created ${createdFees.length}, Skipped ${skippedFees.length}, Errors ${errors.length}`);
    
    res.json({
      success: true,
      message: `Created ${createdFees.length} fees, skipped ${skippedFees.length}, ${errors.length} errors`,
      data: {
        created: createdFees,
        skipped: skippedFees,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    console.error('Auto-create fees error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get fees grouped by month (MUST come before /:id route)
router.get('/grouped-by-month', protect, async (req, res) => {
  try {
    let filter = {};
    const andConditions = [];
    
    // Search filter - includes student fields
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      
      // First, find students matching the search term (name, studentId, rollNumber)
      const matchingStudents = await Student.find({
        $or: [
          { name: searchRegex },
          { studentId: searchRegex },
          { rollNumber: searchRegex }
        ]
      }).select('_id').lean();
      
      const studentIds = matchingStudents.map(s => s._id);
      
      // Build search conditions
      const searchConditions = [
        { feeId: searchRegex },
        { description: searchRegex },
        { transactionId: searchRegex }
      ];
      
      // If we found matching students, add student ID search
      if (studentIds.length > 0) {
        searchConditions.push({ student: { $in: studentIds } });
      }
      
      andConditions.push({
        $or: searchConditions
      });
    }
    
    if (req.query.class) filter.class = req.query.class;
    if (req.query.academicYear) filter.academicYear = req.query.academicYear;
    if (req.query.feeType) filter.feeType = req.query.feeType;
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }
    
    // Combine conditions
    if (andConditions.length > 0) {
      filter = { $and: [filter, ...andConditions] };
    }
    
    const fees = await Fee.find(filter)
      .populate('student', 'name rollNumber studentId class')
      .sort({ month: -1, createdAt: -1 })
      .lean();
    
    // Group fees by month
    const groupedByMonth = {};
    
    fees.forEach(fee => {
      const month = fee.month || 'Unknown';
      if (!groupedByMonth[month]) {
        groupedByMonth[month] = [];
      }
      groupedByMonth[month].push(fee);
    });
    
    // Convert to array format with statistics
    const groupedArray = Object.entries(groupedByMonth).map(([month, monthFees]) => {
      const totalAmount = monthFees.reduce((sum, fee) => sum + (fee.amount || 0), 0);
      const paidAmount = monthFees
        .filter(fee => fee.status === 'Paid')
        .reduce((sum, fee) => sum + (fee.amount || 0), 0);
      const pendingAmount = monthFees
        .filter(fee => fee.status === 'Pending')
        .reduce((sum, fee) => sum + (fee.amount || 0), 0);
      const overdueAmount = monthFees
        .filter(fee => fee.status === 'Overdue')
        .reduce((sum, fee) => sum + (fee.amount || 0), 0);
      
      return {
        month,
        year: month.split('-')[0],
        monthNumber: parseInt(month.split('-')[1]),
        monthName: new Date(`${month}-01`).toLocaleString('default', { month: 'long' }),
        totalFees: monthFees.length,
        totalAmount,
        paidAmount,
        pendingAmount,
        overdueAmount,
        fees: monthFees
      };
    });
    
    // Sort by month (newest first)
    groupedArray.sort((a, b) => {
      if (a.year !== b.year) return parseInt(b.year) - parseInt(a.year);
      return b.monthNumber - a.monthNumber;
    });
    
    res.json({
      success: true,
      data: groupedArray
    });
  } catch (error) {
    console.error('Error grouping fees by month:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Auto-create fees for a class (bulk creation) - MUST come before /:id route
router.post('/auto-create', protect, async (req, res) => {
  try {
    const { class: className, feeType, amount, currency, dueDate, academicYear, description } = req.body;
    
    if (!className || !feeType || !amount || !dueDate) {
      return res.status(400).json({
        success: false,
        message: 'Class, fee type, amount, and due date are required'
      });
    }
    
    // Find all active students in the class
    const students = await Student.find({
      class: className,
      isActive: true
    }).lean();
    
    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No active students found in class ${className}`
      });
    }
    
    const dueDateObj = new Date(dueDate);
    const month = `${dueDateObj.getFullYear()}-${String(dueDateObj.getMonth() + 1).padStart(2, '0')}`;
    
    const createdFees = [];
    const skippedFees = [];
    const errors = [];
    
    for (const student of students) {
      try {
        // Check if fee already exists
        const existingFee = await Fee.findOne({
          student: student._id,
          feeType: feeType,
          month: month
        });
        
        if (existingFee) {
          skippedFees.push({
            student: student.name,
            reason: 'Fee already exists for this month'
          });
          continue;
        }
        
        // Create fee with explicit month field
        const feeData = {
          student: student._id,
          class: student.class || className,
          academicYear: academicYear || new Date().getFullYear().toString(),
          amount: Number(amount),
          currency: currency || 'PKR',
          feeType: feeType,
          dueDate: dueDateObj,
          month: month, // Set month explicitly to ensure it's saved
          status: 'Pending',
          description: description || '',
          isActive: true,
          createdBy: req.user._id
        };
        
        const fee = await Fee.create(feeData);
        
        const populatedFee = await Fee.findById(fee._id)
          .populate('student', 'name rollNumber studentId class')
          .populate('createdBy', 'name');
        
        createdFees.push(populatedFee);
      } catch (error) {
        console.error(`Error creating fee for student ${student.name || student._id}:`, error);
        errors.push({
          student: student.name || student._id.toString(),
          error: error.message || 'Unknown error'
        });
      }
    }
    
    console.log(`Bulk create complete: Created ${createdFees.length}, Skipped ${skippedFees.length}, Errors ${errors.length}`);
    
    res.json({
      success: true,
      message: `Created ${createdFees.length} fees, skipped ${skippedFees.length}, ${errors.length} errors`,
      data: {
        created: createdFees,
        skipped: skippedFees,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    console.error('Auto-create fees error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single fee by ID
router.get('/:id', async (req, res) => {
  try {
    const fee = await Fee.findById(req.params.id)
      .populate('student', 'name rollNumber studentId email phone class address dateOfBirth gender photo')
      .populate('createdBy', 'name email');
    
    if (!fee) {
      return res.status(404).json({ success: false, message: 'Fee not found' });
    }
    
    res.json({ success: true, data: fee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create new fee
router.post('/', async (req, res) => {
  try {
    // Extract month from the due date
    const dueDate = new Date(req.body.dueDate);
    const month = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}`;
    
    // Get student to get class
    const student = await Student.findById(req.body.student);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Check if a fee already exists for this student, fee type, and month
    const existingFee = await Fee.findOne({
      student: req.body.student,
      feeType: req.body.feeType,
      month: month
    });

    if (existingFee) {
      return res.status(400).json({
        success: false,
        message: 'A fee already exists for this student, fee type, and month',
        details: {
          month: month,
          feeType: req.body.feeType,
          studentId: req.body.student
        }
      });
    }

    // Create the fee
    const feeData = {
      ...req.body,
      month: month,
      class: student.class || req.body.class,
      academicYear: req.body.academicYear || new Date().getFullYear().toString(),
      currency: req.body.currency || 'PKR',
      paidAmount: req.body.paidAmount || 0,
      discount: req.body.discount || 0,
      isActive: req.body.isActive !== undefined ? (req.body.isActive === 'true' || req.body.isActive === true) : true,
      createdBy: req.user._id
    };
    
    const fee = await Fee.create(feeData);
    const populatedFee = await Fee.findById(fee._id)
      .populate('student', 'name rollNumber studentId email phone class')
      .populate('createdBy', 'name email');
    
    res.status(201).json({ success: true, data: populatedFee });
  } catch (error) {
    console.error('Create fee error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update fee
router.put('/:id', async (req, res) => {
  try {
    console.log('Update fee request - Status:', req.body.status); // Debug log
    
    const existingFee = await Fee.findById(req.params.id);
    if (!existingFee) {
      return res.status(404).json({ success: false, message: 'Fee not found' });
    }
    
    console.log('Existing fee status before update:', existingFee.status); // Debug log
    
    // Extract month from due date if changed
    let month = existingFee.month;
    if (req.body.dueDate) {
      const dueDate = new Date(req.body.dueDate);
      month = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}`;
    }
    
    // Check for duplicate if student, feeType, or month changed
    if (req.body.student || req.body.feeType || req.body.dueDate) {
      const checkStudent = req.body.student || existingFee.student;
      const checkFeeType = req.body.feeType || existingFee.feeType;
      
      const duplicateFee = await Fee.findOne({
        _id: { $ne: req.params.id },
        student: checkStudent,
        feeType: checkFeeType,
        month: month
      });
      
      if (duplicateFee) {
        return res.status(400).json({
          success: false,
          message: 'A fee already exists for this student, fee type, and month'
        });
      }
    }
    
    // Get student to get class if student changed
    let classValue = existingFee.class;
    if (req.body.student) {
      const student = await Student.findById(req.body.student);
      if (student) {
        classValue = student.class;
      }
    }
    
    const updateData = {
      student: req.body.student ?? existingFee.student,
      class: classValue,
      academicYear: req.body.academicYear ?? existingFee.academicYear,
      amount: req.body.amount !== undefined ? Number(req.body.amount) : existingFee.amount,
      currency: req.body.currency ?? existingFee.currency,
      feeType: req.body.feeType ?? existingFee.feeType,
      month: month,
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : existingFee.dueDate,
      status: req.body.status !== undefined ? req.body.status : existingFee.status,
      paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : existingFee.paymentDate,
      paymentMethod: req.body.paymentMethod ?? existingFee.paymentMethod,
      transactionId: req.body.transactionId ?? existingFee.transactionId,
      paidAmount: req.body.paidAmount !== undefined ? Number(req.body.paidAmount) : existingFee.paidAmount,
      discount: req.body.discount !== undefined ? Number(req.body.discount) : existingFee.discount,
      description: req.body.description ?? existingFee.description,
      remarks: req.body.remarks ?? existingFee.remarks,
      isActive: req.body.isActive !== undefined ? (req.body.isActive === 'true' || req.body.isActive === true) : existingFee.isActive,
    };
    
    console.log('Update data status:', updateData.status); // Debug log
    
    // Validate amounts
    if (updateData.amount < 0) {
      return res.status(400).json({ success: false, message: 'Amount cannot be negative' });
    }
    if (updateData.paidAmount < 0) {
      return res.status(400).json({ success: false, message: 'Paid amount cannot be negative' });
    }
    if (updateData.paidAmount > updateData.amount) {
      return res.status(400).json({ success: false, message: 'Paid amount cannot exceed total amount' });
    }
    if (updateData.discount < 0) {
      return res.status(400).json({ success: false, message: 'Discount cannot be negative' });
    }
    
    // Apply updates
    Object.assign(existingFee, updateData);
    
    console.log('Status after Object.assign:', existingFee.status); // Debug log
    
    // If status was explicitly provided, mark it as modified so pre-save hook respects the manual change
    if (req.body.status !== undefined) {
      existingFee.markModified('status');
      console.log('Status marked as modified - will respect manual change'); // Debug log
    }
    
    // Save the fee (pre-save hook will respect manually set status if it was marked as modified)
    const savedFee = await existingFee.save();
    
    console.log('Status after save:', savedFee.status); // Debug log
    
    const populatedFee = await Fee.findById(savedFee._id)
      .populate('student', 'name rollNumber studentId email phone class')
      .populate('createdBy', 'name email');
    
    res.json({ success: true, data: populatedFee });
  } catch (error) {
    console.error('Update fee error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete fee
router.delete('/:id', async (req, res) => {
  try {
    const fee = await Fee.findByIdAndDelete(req.params.id);
    if (!fee) {
      return res.status(404).json({ success: false, message: 'Fee not found' });
    }
    res.json({ success: true, data: {} });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Record payment for a fee
router.post('/:id/pay', async (req, res) => {
  try {
    const { paidAmount, paymentMethod, transactionId, remarks } = req.body;
    const fee = await Fee.findById(req.params.id);
    
    if (!fee) {
      return res.status(404).json({ success: false, message: 'Fee not found' });
    }
    
    const newPaidAmount = Number(paidAmount) || 0;
    const totalPaid = (fee.paidAmount || 0) + newPaidAmount;
    
    if (totalPaid > fee.amount) {
      return res.status(400).json({ 
        success: false, 
        message: 'Total paid amount cannot exceed fee amount' 
      });
    }
    
    // Update fee
    fee.paidAmount = totalPaid;
    fee.paymentMethod = paymentMethod || fee.paymentMethod;
    fee.transactionId = transactionId || fee.transactionId;
    fee.remarks = remarks || fee.remarks;
    
    // Update status based on paid amount
    if (totalPaid >= fee.amount) {
      fee.status = 'Paid';
      if (!fee.paymentDate) {
        fee.paymentDate = new Date();
      }
    } else if (totalPaid > 0) {
      fee.status = 'Partial';
    }
    
    // Mark status as modified so pre-save hook respects the manual change
    fee.markModified('status');
    fee.markModified('paidAmount');
    
    await fee.save();
    
    const populatedFee = await Fee.findById(fee._id)
      .populate('student', 'name rollNumber studentId email phone class')
      .populate('createdBy', 'name email');
    
    res.json({ success: true, data: populatedFee });
  } catch (error) {
    console.error('Payment error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// Bulk update (activate/deactivate)
router.post('/bulk-update', async (req, res) => {
  try {
    const { ids, isActive } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide an array of fee IDs' });
    }
    
    const result = await Fee.updateMany(
      { _id: { $in: ids } },
      { $set: { isActive: isActive === true || isActive === 'true' } }
    );
    
    res.json({
      success: true,
      message: `${result.modifiedCount} fees updated`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Bulk delete
router.post('/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide an array of fee IDs' });
    }
    
    const result = await Fee.deleteMany({ _id: { $in: ids } });
    
    res.json({
      success: true,
      message: `${result.deletedCount} fees deleted`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Export fees (CSV/Excel)
router.get('/export', async (req, res) => {
  try {
    // Apply same filters as GET /
    let filter = {};
    const andConditions = [];
    
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      
      // First, find students matching the search term (name, studentId, rollNumber)
      const matchingStudents = await Student.find({
        $or: [
          { name: searchRegex },
          { studentId: searchRegex },
          { rollNumber: searchRegex }
        ]
      }).select('_id').lean();
      
      const studentIds = matchingStudents.map(s => s._id);
      
      // Build search conditions
      const searchConditions = [
        { feeId: searchRegex },
        { description: searchRegex },
        { transactionId: searchRegex }
      ];
      
      // If we found matching students, add student ID search
      if (studentIds.length > 0) {
        searchConditions.push({ student: { $in: studentIds } });
      }
      
      andConditions.push({
        $or: searchConditions
      });
    }
    
    if (req.query.student) filter.student = req.query.student;
    if (req.query.class) filter.class = req.query.class;
    if (req.query.feeType) filter.feeType = req.query.feeType;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.currency) filter.currency = req.query.currency;
    if (req.query.academicYear) filter.academicYear = req.query.academicYear;
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }
    
    if (andConditions.length > 0) {
      filter = { $and: [filter, ...andConditions] };
    }
    
    const fees = await Fee.find(filter)
      .populate('student', 'name rollNumber studentId class')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .lean();
    
    const format = req.query.format || 'excel';
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=fees.csv');
      
      const csvStream = fastcsv.format({ headers: true });
      csvStream.pipe(res);
      
      fees.forEach(fee => {
        csvStream.write({
          'Fee ID': fee.feeId || '',
          'Student Name': fee.student?.name || '',
          'Student ID': fee.student?.studentId || '',
          'Roll Number': fee.student?.rollNumber || '',
          'Class': fee.class || fee.student?.class || '',
          'Academic Year': fee.academicYear || '',
          'Fee Type': fee.feeType || '',
          'Amount': fee.amount || 0,
          'Currency': fee.currency || 'PKR',
          'Paid Amount': fee.paidAmount || 0,
          'Discount': fee.discount || 0,
          'Due Date': fee.dueDate ? new Date(fee.dueDate).toLocaleDateString() : '',
          'Status': fee.status || '',
          'Payment Date': fee.paymentDate ? new Date(fee.paymentDate).toLocaleDateString() : '',
          'Payment Method': fee.paymentMethod || '',
          'Transaction ID': fee.transactionId || '',
          'Description': fee.description || '',
          'Remarks': fee.remarks || '',
          'Created By': fee.createdBy?.name || '',
          'Created At': fee.createdAt ? new Date(fee.createdAt).toLocaleDateString() : ''
        });
      });
      
      csvStream.end();
    } else {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Fees');
      
      worksheet.columns = [
        { header: 'Fee ID', key: 'feeId', width: 15 },
        { header: 'Student Name', key: 'studentName', width: 20 },
        { header: 'Student ID', key: 'studentId', width: 15 },
        { header: 'Roll Number', key: 'rollNumber', width: 15 },
        { header: 'Class', key: 'class', width: 10 },
        { header: 'Academic Year', key: 'academicYear', width: 15 },
        { header: 'Fee Type', key: 'feeType', width: 15 },
        { header: 'Amount', key: 'amount', width: 12 },
        { header: 'Currency', key: 'currency', width: 10 },
        { header: 'Paid Amount', key: 'paidAmount', width: 12 },
        { header: 'Discount', key: 'discount', width: 10 },
        { header: 'Due Date', key: 'dueDate', width: 15 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Payment Date', key: 'paymentDate', width: 15 },
        { header: 'Payment Method', key: 'paymentMethod', width: 15 },
        { header: 'Transaction ID', key: 'transactionId', width: 20 },
        { header: 'Description', key: 'description', width: 30 },
        { header: 'Remarks', key: 'remarks', width: 30 }
      ];
      
      fees.forEach(fee => {
        worksheet.addRow({
          feeId: fee.feeId || '',
          studentName: fee.student?.name || '',
          studentId: fee.student?.studentId || '',
          rollNumber: fee.student?.rollNumber || '',
          class: fee.class || fee.student?.class || '',
          academicYear: fee.academicYear || '',
          feeType: fee.feeType || '',
          amount: fee.amount || 0,
          currency: fee.currency || 'PKR',
          paidAmount: fee.paidAmount || 0,
          discount: fee.discount || 0,
          dueDate: fee.dueDate ? new Date(fee.dueDate).toLocaleDateString() : '',
          status: fee.status || '',
          paymentDate: fee.paymentDate ? new Date(fee.paymentDate).toLocaleDateString() : '',
          paymentMethod: fee.paymentMethod || '',
          transactionId: fee.transactionId || '',
          description: fee.description || '',
          remarks: fee.remarks || ''
        });
      });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=fees.xlsx');
      
      await workbook.xlsx.write(res);
      res.end();
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Import fees (CSV/Excel)
router.post('/import', multerExcel.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a file' });
    }
    
    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    const fees = [];
    const errors = [];
    
    if (fileExtension === '.csv') {
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csvParser())
          .on('data', (row) => {
            fees.push(row);
          })
          .on('end', resolve)
          .on('error', reject);
      });
    } else {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      const worksheet = workbook.getWorksheet(1);
      
      const headers = [];
      worksheet.getRow(1).eachCell((cell, colNumber) => {
        headers[colNumber] = cell.value?.toString().trim() || '';
      });
      
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        
        const rowData = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber];
          if (header) {
            rowData[header] = cell.value?.toString().trim() || '';
          }
        });
        fees.push(rowData);
      });
    }
    
    // Process and import fees
    const importedFees = [];
    for (let i = 0; i < fees.length; i++) {
      const row = fees[i];
      try {
        // Map flexible column names
        const studentName = row['Student Name'] || row['studentName'] || row['Student'] || row['student'] || '';
        const studentId = row['Student ID'] || row['studentId'] || row['Student ID'] || '';
        const rollNumber = row['Roll Number'] || row['rollNumber'] || row['Roll No'] || row['rollNo'] || '';
        
        if (!studentName && !studentId && !rollNumber) {
          errors.push({ row: i + 1, error: 'Student information missing' });
          continue;
        }
        
        // Find student
        let student = null;
        if (studentId) {
          student = await Student.findOne({ studentId: studentId });
        }
        if (!student && rollNumber) {
          student = await Student.findOne({ rollNumber: rollNumber });
        }
        if (!student && studentName) {
          student = await Student.findOne({ name: { $regex: new RegExp(studentName, 'i') } });
        }
        
        if (!student) {
          errors.push({ row: i + 1, error: `Student not found: ${studentName || studentId || rollNumber}` });
          continue;
        }
        
        // Map fee data
        const feeType = row['Fee Type'] || row['feeType'] || row['Type'] || 'Tuition';
        const amount = parseFloat(row['Amount'] || row['amount'] || 0);
        const currency = (row['Currency'] || row['currency'] || 'PKR').toUpperCase();
        const dueDate = row['Due Date'] || row['dueDate'] || row['DueDate'];
        const status = row['Status'] || row['status'] || 'Pending';
        const description = row['Description'] || row['description'] || '';
        const academicYear = row['Academic Year'] || row['academicYear'] || new Date().getFullYear().toString();
        
        if (!amount || amount <= 0) {
          errors.push({ row: i + 1, error: 'Invalid amount' });
          continue;
        }
        
        if (!dueDate) {
          errors.push({ row: i + 1, error: 'Due date is required' });
          continue;
        }
        
        const dueDateObj = new Date(dueDate);
        const month = `${dueDateObj.getFullYear()}-${String(dueDateObj.getMonth() + 1).padStart(2, '0')}`;
        
        // Check for duplicate
        const existingFee = await Fee.findOne({
          student: student._id,
          feeType: feeType,
          month: month
        });
        
        if (existingFee) {
          errors.push({ row: i + 1, error: 'Duplicate fee for this student, type, and month' });
          continue;
        }
        
        // Create fee
        const fee = await Fee.create({
          student: student._id,
          class: student.class,
          academicYear: academicYear,
          amount: amount,
          currency: currency,
          feeType: feeType,
          dueDate: dueDateObj,
          status: status,
          description: description,
          isActive: true,
          createdBy: req.user._id
        });
        
        const populatedFee = await Fee.findById(fee._id)
          .populate('student', 'name rollNumber studentId class')
          .populate('createdBy', 'name');
        
        importedFees.push(populatedFee);
  } catch (error) {
        errors.push({ row: i + 1, error: error.message });
      }
    }
    
    // Clean up file
    fs.unlinkSync(filePath);
    
    res.json({
      success: true,
      message: `Imported ${importedFees.length} fees${errors.length > 0 ? `, ${errors.length} errors` : ''}`,
      data: importedFees,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get fee statistics
router.get('/statistics/overview', async (req, res) => {
  try {
    const fees = await Fee.find().lean();
    
    const totalCollected = fees
      .filter(fee => fee.status === 'Paid')
      .reduce((acc, fee) => acc + (fee.amount || 0), 0);

    const pendingAmount = fees
      .filter(fee => fee.status === 'Pending' && new Date(fee.dueDate) >= new Date())
      .reduce((acc, fee) => acc + (fee.amount || 0), 0);

    const overdueFees = fees.filter(fee => 
      (fee.status === 'Pending' && new Date(fee.dueDate) < new Date()) || 
      fee.status === 'Overdue'
    );
    
    const overdueCount = overdueFees.length;
    const overdueAmount = overdueFees.reduce((acc, fee) => acc + (fee.amount || 0), 0);
    
    const partialAmount = fees
      .filter(fee => fee.status === 'Partial')
      .reduce((acc, fee) => acc + (fee.paidAmount || 0), 0);
    
    // Group by currency
    const byCurrency = {};
    fees.forEach(fee => {
      const currency = fee.currency || 'PKR';
      if (!byCurrency[currency]) {
        byCurrency[currency] = { total: 0, paid: 0, pending: 0, overdue: 0 };
      }
      byCurrency[currency].total += fee.amount || 0;
      if (fee.status === 'Paid') {
        byCurrency[currency].paid += fee.amount || 0;
      } else if (fee.status === 'Pending') {
        byCurrency[currency].pending += fee.amount || 0;
      } else if (fee.status === 'Overdue') {
        byCurrency[currency].overdue += fee.amount || 0;
      }
    });

    res.json({
      success: true,
      data: {
        totalCollected,
        pendingAmount,
        overdueCount,
        overdueAmount,
        partialAmount,
        totalFees: fees.length,
        byCurrency
      }
    });
  } catch (error) {
    console.error('Statistics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get currencies list
router.get('/currencies/list', async (req, res) => {
  res.json({ success: true, data: CURRENCIES });
});

// Get fee types list
router.get('/types/list', async (req, res) => {
  res.json({ success: true, data: FEE_TYPES });
});

// Get student's fees
router.get('/student/:studentId', async (req, res) => {
  try {
    const fees = await Fee.find({ student: req.params.studentId })
      .populate('student', 'name rollNumber studentId email phone class')
      .sort('-createdAt')
      .lean();
    
    res.json({ success: true, data: fees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Helper function to generate fee slip design
const generateFeeSlipDesign = (doc, fee, student, pageNumber = 1, totalPages = 1) => {
  const pageWidth = 612; // A4 width in points
  const pageHeight = 792; // A4 height in points
  const margin = 50;
  const contentWidth = pageWidth - 2 * margin;
  
  // Header with school information
  doc.rect(margin, margin, contentWidth, 80)
    .fillColor('#1e3a8a')
    .fill();
  
  // School name
  doc.fillColor('#FFFFFF')
    .fontSize(24)
    .font('Helvetica-Bold')
    .text('School Management System', margin + 20, margin + 15, {
      width: contentWidth - 40,
      align: 'center'
    });
  
  // Fee Slip title
  doc.fontSize(18)
    .text('FEE PAYMENT SLIP', margin + 20, margin + 45, {
      width: contentWidth - 40,
      align: 'center'
    });
  
  // Student Information Section
  let yPos = margin + 100;
  
  doc.fillColor('#000000')
    .fontSize(12)
    .font('Helvetica-Bold')
    .text('STUDENT INFORMATION', margin, yPos);
  
  yPos += 25;
  
  // Student details box
  doc.rect(margin, yPos, contentWidth, 100)
    .strokeColor('#1e3a8a')
    .lineWidth(1)
    .stroke();
  
  const lineHeight = 20;
  const leftCol = margin + 15;
  const rightCol = margin + contentWidth / 2 + 10;
  
  doc.fontSize(10)
    .font('Helvetica');
  
  // Left column
  doc.font('Helvetica-Bold').text('Student Name:', leftCol, yPos + 10);
  doc.font('Helvetica').text(student.name || 'N/A', leftCol + 100, yPos + 10);
  
  doc.font('Helvetica-Bold').text('Student ID:', leftCol, yPos + 10 + lineHeight);
  doc.font('Helvetica').text(student.studentId || 'N/A', leftCol + 100, yPos + 10 + lineHeight);
  
  doc.font('Helvetica-Bold').text('Roll Number:', leftCol, yPos + 10 + lineHeight * 2);
  doc.font('Helvetica').text(student.rollNumber || 'N/A', leftCol + 100, yPos + 10 + lineHeight * 2);
  
  doc.font('Helvetica-Bold').text('Class:', leftCol, yPos + 10 + lineHeight * 3);
  doc.font('Helvetica').text(student.class || fee.class || 'N/A', leftCol + 100, yPos + 10 + lineHeight * 3);
  
  // Right column
  doc.font('Helvetica-Bold').text('Fee ID:', rightCol, yPos + 10);
  doc.font('Helvetica').text(fee.feeId || 'N/A', rightCol + 80, yPos + 10);
  
  doc.font('Helvetica-Bold').text('Academic Year:', rightCol, yPos + 10 + lineHeight);
  doc.font('Helvetica').text(fee.academicYear || 'N/A', rightCol + 80, yPos + 10 + lineHeight);
  
  doc.font('Helvetica-Bold').text('Due Date:', rightCol, yPos + 10 + lineHeight * 2);
  doc.font('Helvetica').text(new Date(fee.dueDate).toLocaleDateString(), rightCol + 80, yPos + 10 + lineHeight * 2);
  
  doc.font('Helvetica-Bold').text('Status:', rightCol, yPos + 10 + lineHeight * 3);
  const statusColor = fee.status === 'Paid' ? '#10b981' : fee.status === 'Overdue' ? '#ef4444' : '#f59e0b';
  doc.fillColor(statusColor)
    .font('Helvetica-Bold')
    .text(fee.status || 'Pending', rightCol + 80, yPos + 10 + lineHeight * 3);
  
  doc.fillColor('#000000');
  
  // Fee Details Section
  yPos += 120;
  
  doc.fontSize(12)
    .font('Helvetica-Bold')
    .text('FEE DETAILS', margin, yPos);
  
  yPos += 25;
  
  // Fee details table
  const tableTop = yPos;
  const rowHeight = 30;
  
  // Table header
  doc.rect(margin, tableTop, contentWidth, rowHeight)
    .fillColor('#1e3a8a')
    .fill();
  
  doc.fillColor('#FFFFFF')
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('Fee Type', margin + 10, tableTop + 8)
    .text('Amount', margin + 150, tableTop + 8)
    .text('Paid', margin + 250, tableTop + 8)
    .text('Discount', margin + 320, tableTop + 8)
    .text('Balance', margin + 420, tableTop + 8);
  
  doc.fillColor('#000000');
  
  // Table row
  const rowY = tableTop + rowHeight;
  doc.rect(margin, rowY, contentWidth, rowHeight)
    .strokeColor('#cccccc')
    .lineWidth(0.5)
    .stroke();
  
  const balance = (fee.amount || 0) - (fee.paidAmount || 0) - (fee.discount || 0);
  
  doc.fontSize(10)
    .font('Helvetica')
    .text(fee.feeType || 'N/A', margin + 10, rowY + 8)
    .text(`${fee.currency || 'PKR'} ${(fee.amount || 0).toLocaleString()}`, margin + 150, rowY + 8)
    .text(`${fee.currency || 'PKR'} ${(fee.paidAmount || 0).toLocaleString()}`, margin + 250, rowY + 8)
    .text(`${fee.currency || 'PKR'} ${(fee.discount || 0).toLocaleString()}`, margin + 320, rowY + 8)
    .text(`${fee.currency || 'PKR'} ${balance.toLocaleString()}`, margin + 420, rowY + 8);
  
  // Summary Section
  yPos = rowY + rowHeight + 30;
  
  doc.rect(margin, yPos, contentWidth / 2, 80)
    .strokeColor('#1e3a8a')
    .lineWidth(2)
    .stroke();
  
  doc.fontSize(11)
    .font('Helvetica-Bold')
    .text('PAYMENT SUMMARY', margin + 15, yPos + 10);
  
  doc.fontSize(10)
    .font('Helvetica');
  
  const summaryY = yPos + 30;
  doc.font('Helvetica-Bold').text('Total Amount:', margin + 15, summaryY);
  doc.font('Helvetica').text(`${fee.currency || 'PKR'} ${(fee.amount || 0).toLocaleString()}`, margin + 120, summaryY);
  
  doc.font('Helvetica-Bold').text('Paid Amount:', margin + 15, summaryY + 20);
  doc.font('Helvetica').text(`${fee.currency || 'PKR'} ${(fee.paidAmount || 0).toLocaleString()}`, margin + 120, summaryY + 20);
  
  doc.font('Helvetica-Bold').text('Remaining Balance:', margin + 15, summaryY + 40);
  doc.fillColor(balance > 0 ? '#ef4444' : '#10b981')
    .font('Helvetica-Bold')
    .text(`${fee.currency || 'PKR'} ${balance.toLocaleString()}`, margin + 120, summaryY + 40);
  
  doc.fillColor('#000000');
  
  // Footer
  const footerY = pageHeight - margin - 40;
  doc.fontSize(8)
    .font('Helvetica')
    .fillColor('#666666')
    .text('This is a computer-generated fee slip. No signature required.', margin, footerY, {
      width: contentWidth,
      align: 'center'
    });
  
  doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, footerY + 15, {
    width: contentWidth,
    align: 'center'
  });
  
  if (totalPages > 1) {
    doc.text(`Page ${pageNumber} of ${totalPages}`, margin, footerY + 30, {
      width: contentWidth,
      align: 'center'
    });
  }
};

// Generate fee slip for single student (single fee)
router.get('/slip/:feeId', protect, async (req, res) => {
  try {
    const fee = await Fee.findById(req.params.feeId)
      .populate('student', 'name rollNumber studentId email phone class address')
      .populate('createdBy', 'name email');
    
    if (!fee) {
      return res.status(404).json({ success: false, message: 'Fee not found' });
    }
    
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0
    });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=fee-slip-${fee.feeId || fee._id}.pdf`);
    
    doc.pipe(res);
    
    generateFeeSlipDesign(doc, fee, fee.student);
    
    doc.end();
  } catch (error) {
    console.error('Error generating fee slip:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Generate fee slips for class (all fees in a class)
router.get('/slips/class/:className', protect, async (req, res) => {
  try {
    const { className } = req.params;
    const { status, month, academicYear } = req.query;
    
    let filter = { class: className };
    if (status) filter.status = status;
    if (month) filter.month = month;
    if (academicYear) filter.academicYear = academicYear;
    
    const fees = await Fee.find(filter)
      .populate('student', 'name rollNumber studentId email phone class')
      .sort({ 'student.name': 1, dueDate: 1 })
      .lean();
    
    if (fees.length === 0) {
      return res.status(404).json({ success: false, message: 'No fees found for this class' });
    }
    
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0
    });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=fee-slips-class-${className}.pdf`);
    
    doc.pipe(res);
    
    fees.forEach((fee, index) => {
      if (index > 0) {
        doc.addPage();
      }
      generateFeeSlipDesign(doc, fee, fee.student, index + 1, fees.length);
    });
    
    doc.end();
  } catch (error) {
    console.error('Error generating class fee slips:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Generate fee slips for bulk (all fees or filtered)
router.get('/slips/bulk', protect, async (req, res) => {
  try {
    const { class: className, status, month, academicYear, studentId } = req.query;
    
    let filter = {};
    if (className) filter.class = className;
    if (status) filter.status = status;
    if (month) filter.month = month;
    if (academicYear) filter.academicYear = academicYear;
    if (studentId) filter.student = studentId;
    
    const fees = await Fee.find(filter)
      .populate('student', 'name rollNumber studentId email phone class')
      .sort({ 'student.name': 1, dueDate: 1 })
      .lean();
    
    if (fees.length === 0) {
      return res.status(404).json({ success: false, message: 'No fees found' });
    }
    
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0
    });
    
    res.setHeader('Content-Type', 'application/pdf');
    const filename = className ? `fee-slips-class-${className}.pdf` : 'fee-slips-all.pdf';
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    
    doc.pipe(res);
    
    fees.forEach((fee, index) => {
      if (index > 0) {
        doc.addPage();
      }
      generateFeeSlipDesign(doc, fee, fee.student, index + 1, fees.length);
    });
    
    doc.end();
  } catch (error) {
    console.error('Error generating bulk fee slips:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Helper function to generate comprehensive fee history slip for a student
const generateFeeHistorySlip = (doc, student, fees) => {
  const pageWidth = 612; // A4 width in points
  const pageHeight = 792; // A4 height in points
  const margin = 50;
  const contentWidth = pageWidth - 2 * margin;
  let yPos = margin;
  
  // Header with school information
  doc.rect(margin, yPos, contentWidth, 80)
    .fillColor('#1e3a8a')
    .fill();
  
  // School name
  doc.fillColor('#FFFFFF')
    .fontSize(24)
    .font('Helvetica-Bold')
    .text('School Management System', margin + 20, yPos + 15, {
      width: contentWidth - 40,
      align: 'center'
    });
  
  // Fee History title
  doc.fontSize(18)
    .text('COMPREHENSIVE FEE HISTORY', margin + 20, yPos + 45, {
      width: contentWidth - 40,
      align: 'center'
    });
  
  yPos += 100;
  
  // Student Information Section
  doc.fillColor('#000000')
    .fontSize(12)
    .font('Helvetica-Bold')
    .text('STUDENT INFORMATION', margin, yPos);
  
  yPos += 25;
  
  // Student details box
  doc.rect(margin, yPos, contentWidth, 80)
    .strokeColor('#1e3a8a')
    .lineWidth(1)
    .stroke();
  
  const lineHeight = 20;
  const leftCol = margin + 15;
  const rightCol = margin + contentWidth / 2 + 10;
  
  doc.fontSize(10)
    .font('Helvetica');
  
  // Left column
  doc.font('Helvetica-Bold').text('Student Name:', leftCol, yPos + 10);
  doc.font('Helvetica').text(student.name || 'N/A', leftCol + 100, yPos + 10);
  
  doc.font('Helvetica-Bold').text('Student ID:', leftCol, yPos + 10 + lineHeight);
  doc.font('Helvetica').text(student.studentId || 'N/A', leftCol + 100, yPos + 10 + lineHeight);
  
  doc.font('Helvetica-Bold').text('Roll Number:', leftCol, yPos + 10 + lineHeight * 2);
  doc.font('Helvetica').text(student.rollNumber || 'N/A', leftCol + 100, yPos + 10 + lineHeight * 2);
  
  doc.font('Helvetica-Bold').text('Class:', leftCol, yPos + 10 + lineHeight * 3);
  doc.font('Helvetica').text(student.class || 'N/A', leftCol + 100, yPos + 10 + lineHeight * 3);
  
  // Right column
  doc.font('Helvetica-Bold').text('Total Fees:', rightCol, yPos + 10);
  doc.font('Helvetica').text(fees.length.toString(), rightCol + 100, yPos + 10);
  
  const totalAmount = fees.reduce((sum, fee) => sum + (fee.amount || 0), 0);
  const totalPaid = fees.reduce((sum, fee) => sum + (fee.paidAmount || 0), 0);
  const totalDiscount = fees.reduce((sum, fee) => sum + (fee.discount || 0), 0);
  const totalBalance = totalAmount - totalPaid - totalDiscount;
  
  doc.font('Helvetica-Bold').text('Total Amount:', rightCol, yPos + 10 + lineHeight);
  doc.font('Helvetica').text(`PKR ${totalAmount.toLocaleString()}`, rightCol + 100, yPos + 10 + lineHeight);
  
  doc.font('Helvetica-Bold').text('Total Paid:', rightCol, yPos + 10 + lineHeight * 2);
  doc.font('Helvetica').text(`PKR ${totalPaid.toLocaleString()}`, rightCol + 100, yPos + 10 + lineHeight * 2);
  
  doc.font('Helvetica-Bold').text('Total Balance:', rightCol, yPos + 10 + lineHeight * 3);
  doc.fillColor(totalBalance > 0 ? '#ef4444' : '#10b981')
    .font('Helvetica-Bold')
    .text(`PKR ${totalBalance.toLocaleString()}`, rightCol + 100, yPos + 10 + lineHeight * 3);
  
  doc.fillColor('#000000');
  
  yPos += 100;
  
  // Fee History Table
  doc.fontSize(12)
    .font('Helvetica-Bold')
    .text('FEE HISTORY (All Years to Current Month)', margin, yPos);
  
  yPos += 25;
  
  // Table header
  const tableTop = yPos;
  const headerHeight = 25;
  const rowHeight = 20;
  
  doc.rect(margin, tableTop, contentWidth, headerHeight)
    .fillColor('#1e3a8a')
    .fill();
  
  doc.fillColor('#FFFFFF')
    .fontSize(8)
    .font('Helvetica-Bold');
  
  const colWidths = {
    date: 60,
    feeId: 70,
    type: 80,
    amount: 70,
    paid: 70,
    discount: 60,
    balance: 70,
    status: 60
  };
  
  let colX = margin + 5;
  doc.text('Date', colX, tableTop + 8);
  colX += colWidths.date;
  doc.text('Fee ID', colX, tableTop + 8);
  colX += colWidths.feeId;
  doc.text('Type', colX, tableTop + 8);
  colX += colWidths.type;
  doc.text('Amount', colX, tableTop + 8);
  colX += colWidths.amount;
  doc.text('Paid', colX, tableTop + 8);
  colX += colWidths.paid;
  doc.text('Disc.', colX, tableTop + 8);
  colX += colWidths.discount;
  doc.text('Balance', colX, tableTop + 8);
  colX += colWidths.balance;
  doc.text('Status', colX, tableTop + 8);
  
  doc.fillColor('#000000');
  
  // Sort fees by due date (oldest first)
  const sortedFees = [...fees].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  
  // Table rows
  let currentY = tableTop + headerHeight;
  sortedFees.forEach((fee, index) => {
    // Check if we need a new page
    if (currentY + rowHeight > pageHeight - margin - 50) {
      doc.addPage();
      currentY = margin;
      
      // Redraw header on new page
      doc.rect(margin, currentY, contentWidth, headerHeight)
        .fillColor('#1e3a8a')
        .fill();
      
      doc.fillColor('#FFFFFF')
        .fontSize(8)
        .font('Helvetica-Bold');
      
      colX = margin + 5;
      doc.text('Date', colX, currentY + 8);
      colX += colWidths.date;
      doc.text('Fee ID', colX, currentY + 8);
      colX += colWidths.feeId;
      doc.text('Type', colX, currentY + 8);
      colX += colWidths.type;
      doc.text('Amount', colX, currentY + 8);
      colX += colWidths.amount;
      doc.text('Paid', colX, currentY + 8);
      colX += colWidths.paid;
      doc.text('Disc.', colX, currentY + 8);
      colX += colWidths.discount;
      doc.text('Balance', colX, currentY + 8);
      colX += colWidths.balance;
      doc.text('Status', colX, currentY + 8);
      
      doc.fillColor('#000000');
      currentY += headerHeight;
    }
    
    // Draw row border
    doc.rect(margin, currentY, contentWidth, rowHeight)
      .strokeColor('#cccccc')
      .lineWidth(0.3)
      .stroke();
    
    // Row data
    doc.fontSize(7)
      .font('Helvetica');
    
    const balance = (fee.amount || 0) - (fee.paidAmount || 0) - (fee.discount || 0);
    const currency = fee.currency || 'PKR';
    
    colX = margin + 5;
    doc.text(new Date(fee.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), colX, currentY + 6);
    colX += colWidths.date;
    doc.text(fee.feeId || 'N/A', colX, currentY + 6);
    colX += colWidths.feeId;
    doc.text(fee.feeType || 'N/A', colX, currentY + 6, { width: colWidths.type - 5 });
    colX += colWidths.type;
    doc.text(`${currency} ${(fee.amount || 0).toLocaleString()}`, colX, currentY + 6);
    colX += colWidths.amount;
    doc.text(`${currency} ${(fee.paidAmount || 0).toLocaleString()}`, colX, currentY + 6);
    colX += colWidths.paid;
    doc.text(`${currency} ${(fee.discount || 0).toLocaleString()}`, colX, currentY + 6);
    colX += colWidths.discount;
    doc.text(`${currency} ${balance.toLocaleString()}`, colX, currentY + 6);
    colX += colWidths.balance;
    
    const statusColor = fee.status === 'Paid' ? '#10b981' : fee.status === 'Overdue' ? '#ef4444' : '#f59e0b';
    doc.fillColor(statusColor)
      .font('Helvetica-Bold')
      .text(fee.status || 'Pending', colX, currentY + 6);
    doc.fillColor('#000000');
    
    currentY += rowHeight;
  });
  
  // Summary section at the end
  const summaryY = currentY + 20;
  
  if (summaryY + 100 > pageHeight - margin) {
    doc.addPage();
    currentY = margin;
  } else {
    currentY = summaryY;
  }
  
  doc.rect(margin, currentY, contentWidth / 2, 100)
    .strokeColor('#1e3a8a')
    .lineWidth(2)
    .stroke();
  
  doc.fontSize(11)
    .font('Helvetica-Bold')
    .text('SUMMARY', margin + 15, currentY + 10);
  
  doc.fontSize(10)
    .font('Helvetica');
  
  const summaryStartY = currentY + 30;
  doc.font('Helvetica-Bold').text('Total Fees:', margin + 15, summaryStartY);
  doc.font('Helvetica').text(fees.length.toString(), margin + 120, summaryStartY);
  
  doc.font('Helvetica-Bold').text('Total Amount:', margin + 15, summaryStartY + 20);
  doc.font('Helvetica').text(`PKR ${totalAmount.toLocaleString()}`, margin + 120, summaryStartY + 20);
  
  doc.font('Helvetica-Bold').text('Total Paid:', margin + 15, summaryStartY + 40);
  doc.font('Helvetica').text(`PKR ${totalPaid.toLocaleString()}`, margin + 120, summaryStartY + 40);
  
  doc.font('Helvetica-Bold').text('Total Discount:', margin + 15, summaryStartY + 60);
  doc.font('Helvetica').text(`PKR ${totalDiscount.toLocaleString()}`, margin + 120, summaryStartY + 60);
  
  doc.font('Helvetica-Bold').text('Total Balance:', margin + 15, summaryStartY + 80);
  doc.fillColor(totalBalance > 0 ? '#ef4444' : '#10b981')
    .font('Helvetica-Bold')
    .text(`PKR ${totalBalance.toLocaleString()}`, margin + 120, summaryStartY + 80);
  
  doc.fillColor('#000000');
  
  // Footer
  const footerY = pageHeight - margin - 40;
  doc.fontSize(8)
    .font('Helvetica')
    .fillColor('#666666')
    .text('This is a computer-generated comprehensive fee history. No signature required.', margin, footerY, {
      width: contentWidth,
      align: 'center'
    });
  
  doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, footerY + 15, {
    width: contentWidth,
    align: 'center'
  });
};

// Generate comprehensive fee history slip for a student (all fees from previous years to current month)
router.get('/slip/student/:studentId/history', protect, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // Find student by ID or studentId
    let student = await Student.findById(studentId);
    if (!student) {
      student = await Student.findOne({ studentId: studentId });
    }
    
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    
    // Get all fees for this student (from all years to current month)
    const fees = await Fee.find({ student: student._id })
      .populate('student', 'name rollNumber studentId email phone class address')
      .sort({ dueDate: 1 })
      .lean();
    
    if (fees.length === 0) {
      return res.status(404).json({ success: false, message: 'No fees found for this student' });
    }
    
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0
    });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=fee-history-${student.studentId || student._id}.pdf`);
    
    doc.pipe(res);
    
    generateFeeHistorySlip(doc, student, fees);
    
    doc.end();
  } catch (error) {
    console.error('Error generating fee history slip:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
