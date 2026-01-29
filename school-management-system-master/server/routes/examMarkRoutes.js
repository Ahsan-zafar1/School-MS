const express = require('express');
const router = express.Router();
const ExamMark = require('../models/ExamMark');
const Student = require('../models/Student');
const Exam = require('../models/Exam');
const { protect } = require('../middleware/auth');
const ExcelJS = require('exceljs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
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

// All routes are protected
router.use(protect);

// Get all results with pagination, sorting, and filtering (MUST be before /:id route)
router.get('/', async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Sorting parameters
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortOrder };

    // Build filter query
    let filter = {};
    const andConditions = [];

    // Search filter (student name, subject, class, resultId, rollNumber)
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      andConditions.push({
        $or: [
          { subject: searchRegex },
          { class: searchRegex },
          { resultId: searchRegex },
          { term: searchRegex },
          { academicYear: searchRegex },
          { grade: searchRegex }
        ]
      });
    }

    // Class filter
    if (req.query.class) {
      filter.class = req.query.class;
    }

    // Subject filter
    if (req.query.subject) {
      filter.subject = req.query.subject;
    }

    // Term filter
    if (req.query.term) {
      filter.term = req.query.term;
    }

    // Academic year filter
    if (req.query.academicYear) {
      filter.academicYear = req.query.academicYear;
    }

    // Grade filter
    if (req.query.grade) {
      filter.grade = req.query.grade;
    }

    // Status filter
    if (req.query.status !== undefined && req.query.status !== '') {
      filter.status = req.query.status;
    }

    // Active filter
    if (req.query.isActive !== undefined && req.query.isActive !== '') {
      filter.isActive = req.query.isActive === 'true' || req.query.isActive === 'active';
    }

    // Student filter (by student ID)
    if (req.query.studentId) {
      filter.student = req.query.studentId;
    }

    // Exam filter
    if (req.query.examId) {
      filter.exam = req.query.examId;
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
    const total = await ExamMark.countDocuments(filter);

    // Calculate pagination info
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Fetch results with pagination
    const results = await ExamMark.find(filter)
      .populate('student', 'name rollNumber studentId email phone class')
      .populate('exam', 'examName examType subject date')
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Recalculate status for all results to ensure consistency
    // (Grade F should always be Fail, regardless of passing percentage)
    const processedResults = results.map(result => {
      const marksObtained = Number(result.marksObtained) || 0;
      const totalMarks = Number(result.totalMarks) || 100;
      const percentage = totalMarks > 0 ? (marksObtained / totalMarks) * 100 : 0;
      const passingPercentage = Number(result.passingPercentage) || 50;
      
      // Recalculate grade
      let grade = 'F';
      if (percentage >= 90) grade = 'A+';
      else if (percentage >= 80) grade = 'A';
      else if (percentage >= 70) grade = 'B';
      else if (percentage >= 60) grade = 'C';
      else if (percentage >= 50) grade = 'D';
      
      // Recalculate status: Grade F always means Fail
      let status = 'Fail';
      if (grade === 'F') {
        status = 'Fail';
      } else {
        const passingMarks = (totalMarks * passingPercentage) / 100;
        status = marksObtained >= passingMarks ? 'Pass' : 'Fail';
      }
      
      return {
        ...result,
        percentage,
        grade,
        status
      };
    });

    res.json({
      success: true,
      data: processedResults,
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
    console.error('Error fetching results:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Export results (MUST be before /:id route)
router.get('/export', async (req, res) => {
  try {
    // Build filter query (same as GET /)
    let filter = {};
    const andConditions = [];

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      andConditions.push({
        $or: [
          { subject: searchRegex },
          { class: searchRegex },
          { resultId: searchRegex },
          { term: searchRegex },
          { academicYear: searchRegex },
          { grade: searchRegex }
        ]
      });
    }

    if (req.query.class) filter.class = req.query.class;
    if (req.query.subject) filter.subject = req.query.subject;
    if (req.query.term) filter.term = req.query.term;
    if (req.query.academicYear) filter.academicYear = req.query.academicYear;
    if (req.query.grade) filter.grade = req.query.grade;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.isActive !== undefined && req.query.isActive !== '') {
      filter.isActive = req.query.isActive === 'true' || req.query.isActive === 'active';
    }
    if (req.query.studentId) filter.student = req.query.studentId;
    if (req.query.examId) filter.exam = req.query.examId;

    if (andConditions.length > 0) {
      if (Object.keys(filter).length > 0) {
        filter = { $and: [filter, ...andConditions] };
      } else {
        filter = andConditions.length === 1 ? andConditions[0] : { $and: andConditions };
      }
    }

    const results = await ExamMark.find(filter)
      .populate('student', 'name rollNumber studentId email class')
      .populate('exam', 'examName examType subject')
      .lean();

    const format = req.query.format || 'excel';

    if (format === 'csv') {
      // CSV Export
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=results.csv');
      
      const csvStream = fastcsv.format({ headers: true });
      csvStream.pipe(res);

      csvStream.write({
        'Result ID': 'resultId',
        'Student Name': 'student.name',
        'Roll Number': 'student.rollNumber',
        'Tracking ID': 'student.studentId',
        'Class': 'class',
        'Subject': 'subject',
        'Exam': 'exam.examName',
        'Term': 'term',
        'Academic Year': 'academicYear',
        'Marks Obtained': 'marksObtained',
        'Total Marks': 'totalMarks',
        'Percentage': 'percentage',
        'Grade': 'grade',
        'Status': 'status',
        'Position': 'position',
        'Remarks': 'remarks'
      });

      results.forEach(result => {
        csvStream.write({
          'Result ID': result.resultId || '',
          'Student Name': result.student?.name || '',
          'Roll Number': result.student?.rollNumber || '',
          'Tracking ID': result.student?.studentId || '',
          'Class': result.class || '',
          'Subject': result.subject || '',
          'Exam': result.exam?.examName || '',
          'Term': result.term || '',
          'Academic Year': result.academicYear || '',
          'Marks Obtained': result.marksObtained || 0,
          'Total Marks': result.totalMarks || 0,
          'Percentage': result.percentage?.toFixed(2) || '0.00',
          'Grade': result.grade || '',
          'Status': result.status || '',
          'Position': result.position || '',
          'Remarks': result.remarks || ''
        });
      });

      csvStream.end();
    } else {
      // Excel Export
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Results');

      // Define columns
      worksheet.columns = [
        { header: 'Result ID', key: 'resultId', width: 15 },
        { header: 'Student Name', key: 'studentName', width: 20 },
        { header: 'Roll Number', key: 'rollNumber', width: 15 },
        { header: 'Tracking ID', key: 'trackingId', width: 15 },
        { header: 'Class', key: 'class', width: 10 },
        { header: 'Subject', key: 'subject', width: 15 },
        { header: 'Exam', key: 'examName', width: 20 },
        { header: 'Term', key: 'term', width: 12 },
        { header: 'Academic Year', key: 'academicYear', width: 15 },
        { header: 'Marks Obtained', key: 'marksObtained', width: 15 },
        { header: 'Total Marks', key: 'totalMarks', width: 12 },
        { header: 'Percentage', key: 'percentage', width: 12 },
        { header: 'Grade', key: 'grade', width: 10 },
        { header: 'Status', key: 'status', width: 10 },
        { header: 'Position', key: 'position', width: 10 },
        { header: 'Remarks', key: 'remarks', width: 20 }
      ];

      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // Add data rows
      results.forEach(result => {
        worksheet.addRow({
          resultId: result.resultId || '',
          studentName: result.student?.name || '',
          rollNumber: result.student?.rollNumber || '',
          trackingId: result.student?.studentId || '',
          class: result.class || '',
          subject: result.subject || '',
          examName: result.exam?.examName || '',
          term: result.term || '',
          academicYear: result.academicYear || '',
          marksObtained: result.marksObtained || 0,
          totalMarks: result.totalMarks || 0,
          percentage: result.percentage ? result.percentage.toFixed(2) : '0.00',
          grade: result.grade || '',
          status: result.status || '',
          position: result.position || '',
          remarks: result.remarks || ''
        });
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=results.xlsx');
      await workbook.xlsx.write(res);
      res.end();
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Import results from Excel/CSV
router.post('/import', multerExcel.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    const results = [];
    const errors = [];

    if (fileExtension === '.csv') {
      // CSV Import
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csvParser())
          .on('data', (row) => {
            results.push(row);
          })
          .on('end', resolve)
          .on('error', reject);
      });
    } else {
      // Excel Import
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      const worksheet = workbook.worksheets[0];

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        const rowData = {};
        row.eachCell((cell, colNumber) => {
          const header = worksheet.getRow(1).getCell(colNumber).value;
          if (header) {
            rowData[header] = cell.value;
          }
        });
        if (Object.keys(rowData).length > 0) {
          results.push(rowData);
        }
      });
    }

    // Process and import results
    let successCount = 0;
    let errorCount = 0;

    for (const row of results) {
      try {
        // Map column names (flexible matching)
        const studentName = row['Student Name'] || row['studentName'] || row['Student'] || row['student'] || '';
        const rollNumber = row['Roll Number'] || row['rollNumber'] || row['Roll No'] || row['rollNo'] || '';
        const trackingId = row['Tracking ID'] || row['trackingId'] || row['Student ID'] || row['studentId'] || '';
        const className = row['Class'] || row['class'] || '';
        const subject = row['Subject'] || row['subject'] || '';
        const examName = row['Exam'] || row['exam'] || row['Exam Name'] || row['examName'] || '';
        const term = row['Term'] || row['term'] || '';
        const academicYear = row['Academic Year'] || row['academicYear'] || row['Year'] || row['year'] || '';
        const marksObtained = parseFloat(row['Marks Obtained'] || row['marksObtained'] || row['Marks'] || row['marks'] || 0);
        const totalMarks = parseFloat(row['Total Marks'] || row['totalMarks'] || row['Total'] || row['total'] || 100);
        const remarks = row['Remarks'] || row['remarks'] || '';

        // Validate required fields
        if (!studentName || !className || !subject || !term || !academicYear) {
          errors.push({ row, error: 'Missing required fields' });
          errorCount++;
          continue;
        }

        // Find student
        let student;
        if (trackingId) {
          student = await Student.findOne({ studentId: trackingId });
        }
        if (!student && rollNumber) {
          student = await Student.findOne({ rollNumber, class: className });
        }
        if (!student) {
          student = await Student.findOne({ name: new RegExp(studentName, 'i'), class: className });
        }

        if (!student) {
          errors.push({ row, error: `Student not found: ${studentName}` });
          errorCount++;
          continue;
        }

        // Find exam
        let exam = null;
        if (examName) {
          exam = await Exam.findOne({ examName: new RegExp(examName, 'i'), subject, class: className });
        }

        // Check if result already exists
        const existingResult = await ExamMark.findOne({
          student: student._id,
          subject,
          term,
          academicYear
        });

        if (existingResult) {
          // Update existing result
          existingResult.marksObtained = marksObtained;
          existingResult.totalMarks = totalMarks;
          existingResult.class = className;
          if (exam) existingResult.exam = exam._id;
          if (remarks) existingResult.remarks = remarks;
          await existingResult.save();
        } else {
          // Create new result
          const newResult = new ExamMark({
            student: student._id,
            exam: exam?._id,
            subject,
            class: className,
            term,
            academicYear,
            marksObtained,
            totalMarks,
            remarks,
            createdBy: req.user._id
          });
          await newResult.save();
        }

        successCount++;
      } catch (error) {
        errors.push({ row, error: error.message });
        errorCount++;
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: `Import completed: ${successCount} successful, ${errorCount} errors`,
      summary: {
        total: results.length,
        success: successCount,
        errors: errorCount
      },
      errors: errors.slice(0, 10) // Return first 10 errors
    });
  } catch (error) {
    console.error('Import error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// Bulk update (activate/deactivate)
router.post('/bulk-update', async (req, res) => {
  try {
    const { ids, isActive } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide an array of result IDs' });
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ success: false, message: 'Please provide isActive as boolean' });
    }

    const result = await ExamMark.updateMany(
      { _id: { $in: ids } },
      { $set: { isActive } }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} result(s) updated successfully`,
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

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide an array of result IDs' });
    }

    const result = await ExamMark.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: `${result.deletedCount} result(s) deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Check if marks exist for student, subject, term, and academic year
router.get('/check/:studentId/:subject/:term/:academicYear', async (req, res) => {
  try {
    const { studentId, subject, term, academicYear } = req.params;

    const existingMarks = await ExamMark.findOne({
      student: studentId,
      subject,
      term,
      academicYear
    });

    if (existingMarks) {
      return res.status(200).json({
        exists: true,
        message: 'Marks already exist for this combination',
        data: existingMarks
      });
    }

    res.status(200).json({
      exists: false,
      message: 'No existing marks found'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single result by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await ExamMark.findById(req.params.id)
      .populate('student', 'name rollNumber studentId email phone class address dateOfBirth gender photo')
      .populate('exam', 'examName examType subject date startTime endTime totalMarks passingMarks')
      .populate('createdBy', 'name email')
      .lean();

    if (!result) {
      return res.status(404).json({ success: false, message: 'Result not found' });
    }

    // Recalculate status to ensure consistency
    const marksObtained = Number(result.marksObtained) || 0;
    const totalMarks = Number(result.totalMarks) || 100;
    const percentage = totalMarks > 0 ? (marksObtained / totalMarks) * 100 : 0;
    const passingPercentage = Number(result.passingPercentage) || 50;
    
    // Recalculate grade
    let grade = 'F';
    if (percentage >= 90) grade = 'A+';
    else if (percentage >= 80) grade = 'A';
    else if (percentage >= 70) grade = 'B';
    else if (percentage >= 60) grade = 'C';
    else if (percentage >= 50) grade = 'D';
    
    // Recalculate status: Grade F always means Fail
    let status = 'Fail';
    if (grade === 'F') {
      status = 'Fail';
    } else {
      const passingMarks = (totalMarks * passingPercentage) / 100;
      status = marksObtained >= passingMarks ? 'Pass' : 'Fail';
    }
    
    const processedResult = {
      ...result,
      percentage,
      grade,
      status
    };

    res.json({ success: true, data: processedResult });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get exam marks by student
router.get('/student/:studentId', async (req, res) => {
  try {
    const results = await ExamMark.find({ student: req.params.studentId })
      .populate('student', 'name rollNumber studentId')
      .populate('exam', 'examName examType subject')
      .sort({ academicYear: -1, term: 1, subject: 1 });

    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get exam marks by class and term
router.get('/class/:class/term/:term/year/:academicYear', async (req, res) => {
  try {
    const { class: className, term, academicYear } = req.params;
    const results = await ExamMark.find({
      class: className,
      term,
      academicYear
    })
      .populate('student', 'name rollNumber studentId')
      .populate('exam', 'examName examType subject')
      .sort({ 'student.name': 1, subject: 1 });

    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create exam marks
router.post('/create', async (req, res) => {
  try {
    // Prepare and validate data
    const resultData = {
      student: req.body.student,
      exam: req.body.exam || undefined, // Optional
      subject: req.body.subject,
      class: req.body.class,
      term: req.body.term,
      academicYear: req.body.academicYear,
      marksObtained: Number(req.body.marksObtained) || 0,
      totalMarks: Number(req.body.totalMarks) || 100,
      passingPercentage: req.body.passingPercentage !== undefined ? Number(req.body.passingPercentage) : undefined,
      remarks: req.body.remarks || '',
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      createdBy: req.user._id
    };

    // Validate required fields
    if (!resultData.student || !resultData.subject || !resultData.class || !resultData.term || !resultData.academicYear) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Validate marks
    if (resultData.marksObtained < 0) {
      return res.status(400).json({ success: false, message: 'Marks obtained cannot be negative' });
    }
    if (resultData.totalMarks <= 0) {
      return res.status(400).json({ success: false, message: 'Total marks must be greater than 0' });
    }
    if (resultData.marksObtained > resultData.totalMarks) {
      return res.status(400).json({ success: false, message: 'Marks obtained cannot exceed total marks' });
    }

    // Check if result already exists
    const existingResult = await ExamMark.findOne({
      student: resultData.student,
      subject: resultData.subject,
      term: resultData.term,
      academicYear: resultData.academicYear
    });

    if (existingResult) {
      return res.status(400).json({ 
        success: false, 
        message: 'Result already exists for this student, subject, term, and academic year',
        data: existingResult
      });
    }

    const result = new ExamMark(resultData);
    const savedResult = await result.save();
    
    const populatedResult = await ExamMark.findById(savedResult._id)
      .populate('student', 'name rollNumber studentId email phone class')
      .populate('exam', 'examName examType subject')
      .populate('createdBy', 'name email');

    res.status(201).json({ success: true, data: populatedResult });
  } catch (error) {
    console.error('Create result error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update exam marks
router.put('/:id', async (req, res) => {
  try {
    // Find the existing result
    const existingResult = await ExamMark.findById(req.params.id);
    if (!existingResult) {
      return res.status(404).json({ success: false, message: 'Result not found' });
    }

    // Prepare and validate update data
    const updateData = {};
    
    // Only update fields that are provided in the request
    if (req.body.student !== undefined) updateData.student = req.body.student;
    if (req.body.exam !== undefined) updateData.exam = req.body.exam || null;
    if (req.body.subject !== undefined) updateData.subject = req.body.subject;
    if (req.body.class !== undefined) updateData.class = req.body.class;
    if (req.body.term !== undefined) updateData.term = req.body.term;
    if (req.body.academicYear !== undefined) updateData.academicYear = req.body.academicYear;
    if (req.body.marksObtained !== undefined) updateData.marksObtained = Number(req.body.marksObtained);
    if (req.body.totalMarks !== undefined) updateData.totalMarks = Number(req.body.totalMarks);
    if (req.body.passingPercentage !== undefined && req.body.passingPercentage !== null) {
      updateData.passingPercentage = Number(req.body.passingPercentage);
    }
    if (req.body.remarks !== undefined) updateData.remarks = req.body.remarks;
    if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;

    // Validate marks (only if they're being updated)
    if (updateData.marksObtained !== undefined) {
      if (updateData.marksObtained < 0) {
        return res.status(400).json({ success: false, message: 'Marks obtained cannot be negative' });
      }
      const totalMarks = updateData.totalMarks !== undefined ? updateData.totalMarks : existingResult.totalMarks;
      if (updateData.marksObtained > totalMarks) {
        return res.status(400).json({ success: false, message: 'Marks obtained cannot exceed total marks' });
      }
    }
    if (updateData.totalMarks !== undefined) {
      if (updateData.totalMarks <= 0) {
        return res.status(400).json({ success: false, message: 'Total marks must be greater than 0' });
      }
      const marksObtained = updateData.marksObtained !== undefined ? updateData.marksObtained : existingResult.marksObtained;
      if (marksObtained > updateData.totalMarks) {
        return res.status(400).json({ success: false, message: 'Marks obtained cannot exceed total marks' });
      }
    }
    if (updateData.passingPercentage !== undefined && (updateData.passingPercentage < 0 || updateData.passingPercentage > 100)) {
      return res.status(400).json({ success: false, message: 'Passing percentage must be between 0 and 100' });
    }

    // Update the result
    Object.assign(existingResult, updateData);
    const savedResult = await existingResult.save();
    
    const populatedResult = await ExamMark.findById(savedResult._id)
      .populate('student', 'name rollNumber studentId email phone class')
      .populate('exam', 'examName examType subject')
      .populate('createdBy', 'name email');

    res.json({ success: true, data: populatedResult });
  } catch (error) {
    console.error('Update result error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete exam marks
router.delete('/:id', async (req, res) => {
  try {
    const result = await ExamMark.findByIdAndDelete(req.params.id);
    
    if (!result) {
      return res.status(404).json({ success: false, message: 'Result not found' });
    }

    res.json({ success: true, message: 'Result deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Generate final report card
router.get('/report/:studentId/:academicYear', async (req, res) => {
  try {
    const { studentId, academicYear } = req.params;
    
    // Get student info
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Get all exam marks for the student in the academic year
    const examMarks = await ExamMark.find({
      student: studentId,
      academicYear,
      isActive: true
    })
      .populate('exam', 'examName examType subject date')
      .sort({ term: 1, subject: 1 });
    
    // Calculate total marks and average for each term
    const termResults = {};
    examMarks.forEach(mark => {
      if (!termResults[mark.term]) {
        termResults[mark.term] = {
          totalMarks: 0,
          obtainedMarks: 0,
          subjects: 0,
          subjectDetails: []
        };
      }
      termResults[mark.term].totalMarks += mark.totalMarks;
      termResults[mark.term].obtainedMarks += mark.marksObtained;
      termResults[mark.term].subjects += 1;
      termResults[mark.term].subjectDetails.push({
        subject: mark.subject,
        marksObtained: mark.marksObtained,
        totalMarks: mark.totalMarks,
        percentage: mark.percentage,
        grade: mark.grade,
        status: mark.status,
        exam: mark.exam?.examName || 'N/A'
      });
    });
    
    // Calculate final result
    const finalResult = {
      student: {
        _id: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        studentId: student.studentId,
        class: student.class,
        email: student.email,
        phone: student.phone
      },
      academicYear,
      termResults: Object.keys(termResults).map(term => ({
        term,
        totalMarks: termResults[term].totalMarks,
        obtainedMarks: termResults[term].obtainedMarks,
        percentage: termResults[term].totalMarks > 0 
          ? (termResults[term].obtainedMarks / termResults[term].totalMarks) * 100 
          : 0,
        subjects: termResults[term].subjects,
        subjectDetails: termResults[term].subjectDetails
      })),
      overall: {
        totalMarks: examMarks.reduce((sum, m) => sum + m.totalMarks, 0),
        obtainedMarks: examMarks.reduce((sum, m) => sum + m.marksObtained, 0),
        totalSubjects: examMarks.length,
        averagePercentage: examMarks.length > 0
          ? examMarks.reduce((sum, m) => sum + m.percentage, 0) / examMarks.length
          : 0
      }
    };
    
    res.json({ success: true, data: finalResult });
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const { class: className, term, academicYear } = req.query;

    let filter = {};
    if (className) filter.class = className;
    if (term) filter.term = term;
    if (academicYear) filter.academicYear = academicYear;

    const totalResults = await ExamMark.countDocuments(filter);
    const passCount = await ExamMark.countDocuments({ ...filter, status: 'Pass' });
    const failCount = await ExamMark.countDocuments({ ...filter, status: 'Fail' });
    const pendingCount = await ExamMark.countDocuments({ ...filter, status: 'Pending' });

    // Calculate average percentage
    const results = await ExamMark.find(filter).lean();
    const avgPercentage = results.length > 0
      ? results.reduce((sum, r) => sum + (r.percentage || 0), 0) / results.length
      : 0;

    // Grade distribution
    const gradeDistribution = {
      'A+': await ExamMark.countDocuments({ ...filter, grade: 'A+' }),
      'A': await ExamMark.countDocuments({ ...filter, grade: 'A' }),
      'B': await ExamMark.countDocuments({ ...filter, grade: 'B' }),
      'C': await ExamMark.countDocuments({ ...filter, grade: 'C' }),
      'D': await ExamMark.countDocuments({ ...filter, grade: 'D' }),
      'F': await ExamMark.countDocuments({ ...filter, grade: 'F' })
    };

    res.json({
      success: true,
      data: {
        totalResults,
        passCount,
        failCount,
        pendingCount,
        passRate: totalResults > 0 ? (passCount / totalResults) * 100 : 0,
        averagePercentage: avgPercentage,
        gradeDistribution
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
