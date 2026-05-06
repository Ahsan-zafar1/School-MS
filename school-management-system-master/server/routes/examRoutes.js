const express = require('express');
const router = express.Router();
const Exam = require('../models/Exam');
const Student = require('../models/Student');
const { protect } = require('../middleware/auth');
const ExcelJS = require('exceljs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { searchRegexFromQuery, pickSortField, EXAM_LIST_SORT } = require('../utils/queryHelpers');
const fastcsv = require('fast-csv');
const csvParser = require('csv-parser');

// Configure multer for Excel/CSV import
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

// Ensure tmp directories exist
const tmpExcelDir = path.join(__dirname, '..', 'tmp', 'excel');
if (!fs.existsSync(tmpExcelDir)) {
  fs.mkdirSync(tmpExcelDir, { recursive: true });
}

// Get all exams with pagination, sorting, and filtering (MUST be before /:id route)
router.get('/', protect, async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Sorting parameters
    const sortBy = pickSortField(req.query.sortBy, EXAM_LIST_SORT, 'date');
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortOrder };

    // Build filter query
    let filter = {};
    const andConditions = [];

    // Search filter (examName, subject, class, examId)
    if (req.query.search) {
      const searchRegex = searchRegexFromQuery(req.query.search);
      if (searchRegex) {
        andConditions.push({
          $or: [
            { examName: searchRegex },
            { subject: searchRegex },
            { class: searchRegex },
            { examId: searchRegex },
            { roomNumber: searchRegex }
          ]
        });
      }
    }

    // Class filter
    if (req.query.class) {
      filter.class = req.query.class;
    }

    // Subject filter
    if (req.query.subject) {
      filter.subject = req.query.subject;
    }

    // Exam type filter
    if (req.query.examType) {
      filter.examType = req.query.examType;
    }

    // Status filter
    if (req.query.status !== undefined && req.query.status !== '') {
      filter.status = req.query.status;
    }

    // Active filter
    if (req.query.isActive !== undefined && req.query.isActive !== '') {
      filter.isActive = req.query.isActive === 'true' || req.query.isActive === 'active';
    }

    // Academic year filter
    if (req.query.academicYear) {
      filter.academicYear = req.query.academicYear;
    }

    // Date range filters
    if (req.query.dateFrom) {
      filter.date = { ...filter.date, $gte: new Date(req.query.dateFrom) };
    }
    if (req.query.dateTo) {
      filter.date = { ...filter.date, $lte: new Date(req.query.dateTo) };
    }

    // Combine all conditions properly
    if (andConditions.length > 0) {
      if (Object.keys(filter).length > 0) {
        filter = { $and: [filter, ...andConditions] };
      } else {
        filter = andConditions.length === 1 ? andConditions[0] : { $and: andConditions };
      }
    }

    // Get total count for pagination
    const total = await Exam.countDocuments(filter);

    // Calculate pagination info
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Fetch exams with pagination
    const exams = await Exam.find(filter)
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Calculate student count for each exam
    const examsWithCounts = await Promise.all(exams.map(async (exam) => {
      const studentCount = await Student.countDocuments({ 
        class: exam.class,
        isActive: true 
      });
      
      return {
        ...exam,
        studentCount: studentCount
      };
    }));

    res.json({
      success: true,
      data: examsWithCounts,
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
    console.error('Error fetching exams:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching exams',
      error: error.message
    });
  }
});

// Export exams as CSV or Excel (MUST be before /:id route)
router.get('/export', protect, async (req, res) => {
  try {
    const format = req.query.format || 'csv'; // csv or excel
    
    // Build query with optional filters (same as GET /)
    let filter = {};
    const andConditions = [];
    
    // Search filter
    if (req.query.search) {
      const searchRegex = searchRegexFromQuery(req.query.search);
      if (searchRegex) {
        andConditions.push({
          $or: [
            { examName: searchRegex },
            { subject: searchRegex },
            { class: searchRegex },
            { examId: searchRegex }
          ]
        });
      }
    }
    
    if (req.query.class) filter.class = req.query.class;
    if (req.query.subject) filter.subject = req.query.subject;
    if (req.query.examType) filter.examType = req.query.examType;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.academicYear) filter.academicYear = req.query.academicYear;
    if (req.query.isActive !== undefined && req.query.isActive !== '') {
      filter.isActive = req.query.isActive === 'true' || req.query.isActive === 'active';
    }
    
    if (req.query.dateFrom) {
      filter.date = { ...filter.date, $gte: new Date(req.query.dateFrom) };
    }
    if (req.query.dateTo) {
      filter.date = { ...filter.date, $lte: new Date(req.query.dateTo) };
    }
    
    // Combine all conditions properly
    if (andConditions.length > 0) {
      if (Object.keys(filter).length > 0) {
        filter = { $and: [filter, ...andConditions] };
      } else {
        filter = andConditions.length === 1 ? andConditions[0] : { $and: andConditions };
      }
    }
    
    const exams = await Exam.find(filter)
      .populate('createdBy', 'name')
      .lean();
    
    if (!exams.length) {
      return res.status(404).json({ success: false, message: 'No exams found to export' });
    }
    
    // Calculate student counts
    const examsWithCounts = await Promise.all(exams.map(async (exam) => {
      const studentCount = await Student.countDocuments({ 
        class: exam.class,
        isActive: true 
      });
      return { ...exam, studentCount };
    }));
    
    const fields = [
      'examId', 'examName', 'examType', 'subject', 'class', 'academicYear', 
      'date', 'startTime', 'endTime', 'duration', 'totalMarks', 'passingMarks',
      'roomNumber', 'status', 'isActive', 'studentCount', 'instructions', 'description'
    ];
    
    if (format === 'excel' || format === 'xlsx') {
      // Export as Excel
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Exams');
      
      worksheet.columns = [
        { header: 'Tracking ID', key: 'examId', width: 15 },
        { header: 'Exam Name', key: 'examName', width: 25 },
        { header: 'Exam Type', key: 'examType', width: 15 },
        { header: 'Subject', key: 'subject', width: 20 },
        { header: 'Class', key: 'class', width: 12 },
        { header: 'Academic Year', key: 'academicYear', width: 15 },
        { header: 'Date', key: 'date', width: 12 },
        { header: 'Start Time', key: 'startTime', width: 12 },
        { header: 'End Time', key: 'endTime', width: 12 },
        { header: 'Duration (min)', key: 'duration', width: 12 },
        { header: 'Total Marks', key: 'totalMarks', width: 12 },
        { header: 'Passing Marks', key: 'passingMarks', width: 12 },
        { header: 'Room Number', key: 'roomNumber', width: 12 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Active', key: 'isActive', width: 10 },
        { header: 'Students', key: 'studentCount', width: 12 },
        { header: 'Instructions', key: 'instructions', width: 40 },
        { header: 'Description', key: 'description', width: 40 }
      ];
      
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      
      examsWithCounts.forEach(exam => {
        const row = {
          examId: exam.examId || '',
          examName: exam.examName || '',
          examType: exam.examType || '',
          subject: exam.subject || '',
          class: exam.class || '',
          academicYear: exam.academicYear || '',
          date: exam.date ? new Date(exam.date).toLocaleDateString() : '',
          startTime: exam.startTime || '',
          endTime: exam.endTime || '',
          duration: exam.duration || 0,
          totalMarks: exam.totalMarks || 0,
          passingMarks: exam.passingMarks || 0,
          roomNumber: exam.roomNumber || '',
          status: exam.status || '',
          isActive: exam.isActive ? 'Yes' : 'No',
          studentCount: exam.studentCount || 0,
          instructions: exam.instructions || '',
          description: exam.description || ''
        };
        worksheet.addRow(row);
      });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=exams.xlsx');
      
      await workbook.xlsx.write(res);
      res.end();
    } else {
      // Export as CSV
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=exams-${new Date().toISOString().split('T')[0]}.csv`);
      
      res.write('\ufeff'); // BOM for UTF-8
      
      fastcsv
        .write(examsWithCounts.map(c => {
          const obj = {};
          fields.forEach(f => {
            if (f === 'date') {
              obj[f] = c.date ? new Date(c.date).toLocaleDateString() : '';
            } else if (f === 'isActive') {
              obj[f] = c.isActive ? 'Yes' : 'No';
            } else {
              obj[f] = c[f] || '';
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
    console.error('Error exporting exams:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        message: 'Error exporting exams', 
        error: error.message 
      });
    }
  }
});

// Get single exam by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const examData = await Exam.findById(req.params.id)
      .populate('createdBy', 'name email')
      .lean();

    if (!examData) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Count students by querying Student collection
    const studentCount = await Student.countDocuments({ 
      class: examData.class,
      isActive: true 
    });

    // Add studentCount to the response
    const examDataWithCount = {
      ...examData,
      studentCount: studentCount
    };

    res.json({
      success: true,
      data: examDataWithCount
    });
  } catch (error) {
    console.error('Error fetching exam:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching exam details',
      error: error.message
    });
  }
});

// Create new exam
router.post('/', protect, async (req, res) => {
  try {
    const examData = {
      ...req.body,
      createdBy: req.user._id
    };

    if (examData.isActive !== undefined && typeof examData.isActive === 'string') {
      examData.isActive = examData.isActive === 'true' || examData.isActive === 'True';
    }
    if (examData.date !== undefined && examData.date !== '') {
      examData.date = examData.date instanceof Date ? examData.date : new Date(examData.date);
    }
    if (examData.duration !== undefined && examData.duration !== '') {
      const n = Number(examData.duration);
      examData.duration = Number.isFinite(n) ? n : 60;
    }
    if (examData.totalMarks !== undefined && examData.totalMarks !== '') {
      const n = Number(examData.totalMarks);
      examData.totalMarks = Number.isFinite(n) ? n : 100;
    }
    if (examData.passingMarks !== undefined && examData.passingMarks !== '') {
      const n = Number(examData.passingMarks);
      examData.passingMarks = Number.isFinite(n) ? n : 50;
    }

    const exam = await Exam.create(examData);
    const populatedExam = await Exam.findById(exam._id)
      .populate('createdBy', 'name email')
      .lean();

    res.status(201).json({
      success: true,
      data: populatedExam
    });
  } catch (error) {
    console.error('Error creating exam:', error);
    const message = error.name === 'ValidationError' && error.errors
      ? Object.values(error.errors).map(e => e.message).filter(Boolean).join(', ') || error.message
      : (error.message || 'Error creating exam');
    res.status(400).json({
      success: false,
      message,
      error: error.message
    });
  }
});

// Update exam (only allowed fields; never overwrite _id, examId, createdBy)
router.put('/:id', protect, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    const allowed = [
      'examName', 'examType', 'subject', 'class', 'academicYear', 'date',
      'startTime', 'endTime', 'duration', 'totalMarks', 'passingMarks',
      'roomNumber', 'instructions', 'description', 'isActive', 'status'
    ];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    if (update.isActive !== undefined && typeof update.isActive === 'string') {
      update.isActive = update.isActive === 'true' || update.isActive === 'True';
    }
    if (update.date !== undefined && typeof update.date === 'string') {
      update.date = new Date(update.date);
    }
    if (update.duration !== undefined) update.duration = Number(update.duration);
    if (update.totalMarks !== undefined) update.totalMarks = Number(update.totalMarks);
    if (update.passingMarks !== undefined) update.passingMarks = Number(update.passingMarks);

    const updatedExam = await Exam.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email').lean();

    res.json({
      success: true,
      data: updatedExam
    });
  } catch (error) {
    console.error('Error updating exam:', error);
    const message = error.name === 'ValidationError' && error.errors
      ? Object.values(error.errors).map(e => e.message).filter(Boolean).join(', ') || error.message
      : (error.message || 'Error updating exam');
    res.status(400).json({
      success: false,
      message,
      error: error.message
    });
  }
});

// Delete exam
router.delete('/:id', protect, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    await Exam.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Exam deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting exam:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting exam',
      error: error.message
    });
  }
});

// Bulk update exams (activate/deactivate)
router.post('/bulk-update', protect, async (req, res) => {
  try {
    const { ids, action } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide exam IDs'
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
        message: 'Invalid action. Use "activate" or "deactivate"'
      });
    }

    const result = await Exam.updateMany(
      { _id: { $in: ids } },
      update
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} exam(s) updated successfully`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error in bulk update:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating exams',
      error: error.message
    });
  }
});

// Bulk delete exams
router.post('/bulk-delete', protect, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide exam IDs'
      });
    }

    const result = await Exam.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: `${result.deletedCount} exam(s) deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error in bulk delete:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting exams',
      error: error.message
    });
  }
});

// Import exams from CSV or Excel
router.post('/import', protect, multerExcel.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  
  const results = [];
  const errors = [];
  const fileExtension = path.extname(req.file.originalname).toLowerCase();
  
  try {
    if (fileExtension === '.xlsx' || fileExtension === '.xls') {
      // Import from Excel
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(req.file.path);
      
      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, message: 'Excel file is empty or invalid' });
      }
      
      // Get headers from first row
      const headerRow = worksheet.getRow(1);
      const headers = {};
      headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const headerValue = cell.value ? cell.value.toString().trim() : '';
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
    
    // Normalize field names and import
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < results.length; i++) {
      const row = results[i];
      try {
        // Map various field name formats
        const examData = {
          examName: row.examname || row['exam name'] || row.exam || '',
          examType: row.examtype || row['exam type'] || row.type || 'Midterm',
          subject: row.subject || '',
          class: row.class || row.classname || '',
          academicYear: row.academicyear || row['academic year'] || row.year || '',
          date: row.date ? new Date(row.date) : new Date(),
          startTime: row.starttime || row['start time'] || row.time || '',
          endTime: row.endtime || row['end time'] || '',
          duration: parseInt(row.duration) || 60,
          totalMarks: parseInt(row.totalmarks || row['total marks'] || row.marks || 100),
          passingMarks: parseInt(row.passingmarks || row['passing marks'] || 50),
          roomNumber: row.roomnumber || row['room number'] || row.room || '',
          instructions: row.instructions || '',
          description: row.description || '',
          status: row.status || 'Scheduled',
          isActive: row.isactive === 'false' || row['is active'] === 'false' ? false : true,
          createdBy: req.user._id
        };
        
        // Validate required fields
        if (!examData.examName || !examData.subject || !examData.class) {
          errors.push({ row: i + 2, error: 'Missing required fields (examName, subject, class)' });
          errorCount++;
          continue;
        }
        
        await Exam.create(examData);
        successCount++;
      } catch (error) {
        errors.push({ row: i + 2, error: error.message });
        errorCount++;
      }
    }
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    
    res.json({
      success: true,
      message: `Import completed: ${successCount} successful, ${errorCount} errors`,
      summary: {
        total: results.length,
        successful: successCount,
        errors: errorCount
      },
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error importing exams:', error);
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: 'Error importing exams',
      error: error.message
    });
  }
});

module.exports = router;
