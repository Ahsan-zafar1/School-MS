const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const { protect } = require('../middleware/auth');
const ExcelJS = require('exceljs');
const fastcsv = require('fast-csv');
const csvParser = require('csv-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { searchRegexFromQuery, pickSortField, ATTENDANCE_LIST_SORT } = require('../utils/queryHelpers');

// Protect all routes
router.use(protect);

// Route to drop old index - can be called to permanently fix the issue
router.post('/drop-old-index', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const collection = db.collection('attendances');
    
    // Get all indexes
    const indexes = await collection.indexes();
    
    // Try to drop the old index
    let dropped = false;
    try {
      await collection.dropIndex('date_1_student_1');
      dropped = true;
    } catch (error) {
      if (error.code === 27 || error.codeName === 'IndexNotFound' || error.message.includes('not found')) {
        // Index doesn't exist
      } else {
        throw error;
      }
    }
    
    // Get indexes after
    const indexesAfter = await collection.indexes();
    
    res.json({
      success: true,
      message: dropped ? 'Old index dropped successfully' : 'Index does not exist',
      indexesBefore: indexes.map(i => ({ name: i.name, key: i.key })),
      indexesAfter: indexesAfter.map(i => ({ name: i.name, key: i.key, partialFilter: i.partialFilterExpression }))
    });
  } catch (error) {
    console.error('Error dropping index:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

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

// Get all attendance records with pagination, sorting, and filtering
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const sortBy = pickSortField(req.query.sortBy, ATTENDANCE_LIST_SORT, 'date');
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortOrder };
    
    // Build filter
    let filter = {};
    const andConditions = [];
    
    // Search filter
    if (req.query.search) {
      const searchRegex = searchRegexFromQuery(req.query.search);
      if (searchRegex) {
        andConditions.push({
          $or: [
            { attendanceId: searchRegex },
            { remarks: searchRegex }
          ]
        });
      }
    }
    
    // Type filter (student or teacher)
    if (req.query.type) {
      filter.type = req.query.type;
    }
    
    // Date filters
    if (req.query.date) {
      const date = new Date(req.query.date);
      date.setUTCHours(0, 0, 0, 0);
      const nextDay = new Date(date);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      filter.date = { $gte: date, $lt: nextDay };
    } else if (req.query.dateFrom || req.query.dateTo) {
      filter.date = {};
      if (req.query.dateFrom) {
        const dateFrom = new Date(req.query.dateFrom);
        dateFrom.setUTCHours(0, 0, 0, 0);
        filter.date.$gte = dateFrom;
      }
      if (req.query.dateTo) {
        const dateTo = new Date(req.query.dateTo);
        dateTo.setUTCHours(23, 59, 59, 999);
        filter.date.$lte = dateTo;
      }
    }
    
    // Specific filters
    if (req.query.student) filter.student = req.query.student;
    if (req.query.teacher) filter.teacher = req.query.teacher;
    if (req.query.class) filter.class = req.query.class;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.academicYear) filter.academicYear = req.query.academicYear;
    if (req.query.recordedBy) filter.recordedBy = req.query.recordedBy;
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }
    
    // Combine conditions
    if (andConditions.length > 0) {
      filter = { $and: [filter, ...andConditions] };
    }
    
    // Get total count
    const total = await Attendance.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    // Fetch attendance with pagination
    // .lean() returns all fields by default, including attendanceId, checkInTime, checkOutTime
    const attendance = await Attendance.find(filter)
      .populate('student', 'name rollNumber studentId email phone class')
      .populate('teacher', 'name teacherId email phone department')
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Ensure attendanceId is present for all records (generate if missing)
    const attendanceWithIds = attendance.map(record => {
      if (!record.attendanceId) {
        // Generate attendanceId if missing (for old records)
        const prefix = record.type === 'student' ? 'ATT-STU' : 'ATT-TEA';
        const timestamp = record._id ? record._id.toString().slice(-6) : Date.now().toString().slice(-6);
        record.attendanceId = `${prefix}-${timestamp}`;
      }
      return record;
    });
    
    res.json({
      success: true,
      data: attendanceWithIds,
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
    console.error('Error fetching attendance:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get attendance for a specific date and class (for marking)
router.get('/mark/:date/:className', async (req, res) => {
  try {
    const { date, className } = req.params;
    const attendanceDate = new Date(date);
    attendanceDate.setUTCHours(0, 0, 0, 0);
    const nextDay = new Date(attendanceDate);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    
    // Get all students in the class
    const students = await Student.find({ 
      class: className,
      isActive: true 
    })
      .select('name rollNumber studentId class')
      .sort({ rollNumber: 1 })
      .lean();
    
    // Get existing attendance records for this date
    const existingAttendance = await Attendance.find({
      date: { $gte: attendanceDate, $lt: nextDay },
      class: className,
      type: 'student'
    })
      .populate('student', 'name rollNumber studentId class')
      .lean();
    
    // Map students to attendance records
    const attendanceData = students.map(student => {
      const existing = existingAttendance.find(a => 
        a.student && a.student._id.toString() === student._id.toString()
      );

      if (existing) {
        return {
          ...existing,
          student: student
        };
      } else {
        return {
          _id: null,
          attendanceId: null,
          date: attendanceDate,
          student: student,
          class: className,
          type: 'student',
          status: 'unmarked',
          checkInTime: null,
          checkOutTime: null,
          isLate: false,
          lateMinutes: 0,
          isEarlyDeparture: false,
          earlyDepartureMinutes: 0,
          recordedBy: 'manual',
          remarks: ''
        };
      }
    });

    res.json({ 
      success: true, 
      data: attendanceData,
      date: attendanceDate,
      class: className
    });
  } catch (error) {
    console.error('Error fetching attendance for marking:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get teacher attendance for a specific date
router.get('/teachers/mark/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const attendanceDate = new Date(date);
    attendanceDate.setUTCHours(0, 0, 0, 0);
    const nextDay = new Date(attendanceDate);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    
    // Get all active teachers
    const teachers = await Teacher.find({ isActive: true })
      .select('name teacherId email phone department')
      .sort({ name: 1 })
      .lean();
    
    // Get existing attendance records for this date
    const existingAttendance = await Attendance.find({
      date: { $gte: attendanceDate, $lt: nextDay },
      type: 'teacher'
    })
      .populate('teacher', 'name teacherId email phone department')
      .lean();
    
    // Map teachers to attendance records
    const attendanceData = teachers.map(teacher => {
      const existing = existingAttendance.find(a => {
        if (!a.teacher) return false;
        // Handle both populated and non-populated teacher objects
        const existingTeacherId = a.teacher._id ? a.teacher._id.toString() : a.teacher.toString();
        return existingTeacherId === teacher._id.toString();
      });
      
      // Ensure teacher object has _id in the correct format
      const teacherWithId = {
        ...teacher,
        _id: teacher._id // This is already an ObjectId from .lean()
      };
      
      if (existing) {
        return {
          ...existing,
          teacher: teacherWithId, // Ensure teacher object is properly structured
          status: existing.status || 'unmarked'
        };
      } else {
        return {
          _id: null,
          attendanceId: null,
          date: attendanceDate,
          teacher: teacherWithId, // Ensure teacher object is properly structured
          type: 'teacher',
          status: 'unmarked',
          checkInTime: null,
          checkOutTime: null,
          isLate: false,
          lateMinutes: 0,
          isEarlyDeparture: false,
          earlyDepartureMinutes: 0,
          recordedBy: 'manual',
          remarks: ''
        };
      }
    });

    console.log('Returning teacher attendance data:', {
      totalTeachers: teachers.length,
      attendanceRecords: attendanceData.length,
      sampleTeacher: attendanceData[0]?.teacher ? {
        name: attendanceData[0].teacher.name,
        _id: attendanceData[0].teacher._id?.toString(),
        teacherId: attendanceData[0].teacher.teacherId
      } : null
    });

    res.json({ 
      success: true, 
      data: attendanceData,
      date: attendanceDate
    });
  } catch (error) {
    console.error('Error fetching teacher attendance for marking:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mark attendance for multiple students
router.post('/mark', async (req, res) => {
  try {
    const { date, class: className, attendanceData, academicYear } = req.body;

    if (!date || !className || !attendanceData || !Array.isArray(attendanceData)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Date, class, and attendanceData array are required'
      });
    }

    const attendanceDate = new Date(date);
    attendanceDate.setUTCHours(0, 0, 0, 0);
    const nextDay = new Date(attendanceDate);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    // Validate students and convert IDs to ObjectIds
    const studentIds = attendanceData
      .map(record => record.studentId)
      .filter(id => id != null && id !== undefined && id !== '');
    
    if (studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid student IDs provided'
      });
    }
    
    const studentObjectIds = studentIds
      .map(id => {
        try {
          return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
        } catch (e) {
          return null;
        }
      })
      .filter(id => id !== null);
    
    if (studentObjectIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID format'
      });
    }
    
    const students = await Student.find({ 
      _id: { $in: studentObjectIds },
      class: className,
      isActive: true
    }).select('_id name class').lean();

    if (students.length !== studentObjectIds.length) {
      console.warn('Some students not found or not in class:', {
        requested: studentObjectIds.length,
        found: students.length
      });
    }

    // Delete existing records for this date and class for these students
    if (studentObjectIds.length > 0) {
    await Attendance.deleteMany({
        date: { $gte: attendanceDate, $lt: nextDay },
        class: className,
        type: 'student',
        student: { $in: studentObjectIds }
      });
    }

    // Create new attendance records
    const records = [];
    for (const record of attendanceData) {
      if (record.status && record.status !== 'unmarked') {
        const checkInTime = record.checkInTime ? new Date(record.checkInTime) : null;
        const checkOutTime = record.checkOutTime ? new Date(record.checkOutTime) : null;
        
        // Convert studentId to ObjectId
        let studentObjectId;
        try {
          studentObjectId = mongoose.Types.ObjectId.isValid(record.studentId) 
            ? new mongoose.Types.ObjectId(record.studentId)
            : null;
          if (!studentObjectId) {
            continue; // Skip invalid IDs
          }
        } catch (e) {
          console.error('Error converting studentId to ObjectId:', record.studentId, e);
          continue;
        }
        
        // Create record object - explicitly exclude teacher field for student records
        const attendanceRecord = {
      date: attendanceDate,
          student: studentObjectId,
      class: className,
          type: 'student',
          academicYear: academicYear || new Date().getFullYear().toString(),
      status: record.status,
          checkInTime: checkInTime,
          checkOutTime: checkOutTime,
          isLate: record.isLate || false,
          lateMinutes: record.lateMinutes || 0,
          isEarlyDeparture: record.isEarlyDeparture || false,
          earlyDepartureMinutes: record.earlyDepartureMinutes || 0,
          recordedBy: record.recordedBy || 'manual',
          machineId: record.machineId || null,
          machineRecordId: record.machineRecordId || null,
          remarks: record.remarks || '',
          isActive: true,
          createdBy: req.user._id
        };
        
        records.push(attendanceRecord);
      }
    }
    
    if (records.length > 0) {
      await Attendance.insertMany(records, { ordered: false });
      console.log('✅ Successfully inserted', records.length, 'student attendance records');
    }
    
    // Fetch updated records
    const updatedRecords = await Attendance.find({
      date: { $gte: attendanceDate, $lt: nextDay },
      class: className,
      type: 'student'
    })
      .populate('student', 'name rollNumber studentId class')
      .populate('createdBy', 'name')
      .sort({ 'student.rollNumber': 1 })
      .lean();
    
    res.json({
      success: true,
      message: `Attendance marked for ${records.length} students`,
      data: updatedRecords
    });
  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mark teacher attendance
router.post('/teachers/mark', async (req, res) => {
  try {
    const { date, attendanceData, academicYear } = req.body;
    
    console.log('📥 Received teacher attendance request:', {
      date,
      recordCount: attendanceData?.length,
      hasUser: !!req.user,
      userId: req.user?._id
    });
    
    if (!date || !attendanceData || !Array.isArray(attendanceData)) {
      return res.status(400).json({
        success: false,
        message: 'Date and attendanceData array are required'
      });
    }

    if (!req.user || !req.user._id) {
      return res.status(401).json({
      success: false, 
        message: 'User authentication required'
      });
    }
    
    const attendanceDate = new Date(date);
    attendanceDate.setUTCHours(0, 0, 0, 0);
    const nextDay = new Date(attendanceDate);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    
    // Validate teachers and filter out invalid records
    const teacherIds = attendanceData
      .map(record => record.teacherId)
      .filter(id => id != null && id !== undefined && id !== '');
    
    if (teacherIds.length === 0) {
      console.error('No teacher IDs provided in request:', attendanceData);
      return res.status(400).json({
        success: false,
        message: 'No valid teacher IDs provided'
      });
    }
    
    // Convert teacher IDs to ObjectIds for query
    const teacherObjectIds = teacherIds
      .map(id => {
        try {
          return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
        } catch (e) {
          console.error('Invalid teacher ID:', id, e);
          return null;
        }
      })
      .filter(id => id !== null);
    
    if (teacherObjectIds.length === 0) {
      console.error('No valid ObjectIds after conversion:', teacherIds);
      return res.status(400).json({
        success: false,
        message: 'Invalid teacher ID format'
      });
    }
    
    const teachers = await Teacher.find({
      _id: { $in: teacherObjectIds },
      isActive: true
    }).select('_id name').lean();
    
    console.log('Teacher validation:', {
      requestedIds: teacherIds,
      convertedObjectIds: teacherObjectIds.map(id => id.toString()),
      foundTeachers: teachers.map(t => t._id.toString()),
      foundCount: teachers.length,
      requestedCount: teacherIds.length
    });
    
    if (teachers.length !== teacherIds.length) {
      console.warn('Some teacher IDs not found:', {
        requested: teacherIds,
        found: teachers.map(t => t._id.toString())
      });
      // Don't fail - just process the ones we found
    }
    
    // Filter attendanceData to only include valid teacher IDs that were found
    const foundTeacherIds = teachers.map(t => t._id.toString());
    const validAttendanceData = attendanceData.filter(record => {
      if (!record.teacherId) return false;
      // Check if this teacherId matches any found teacher
      const recordId = record.teacherId.toString();
      return foundTeacherIds.some(foundId => foundId === recordId || foundId === record.teacherId);
    });
    
    console.log('Processing teacher attendance:', {
      totalRecords: attendanceData.length,
      validRecords: validAttendanceData.length,
      teacherIds: teacherIds,
      foundTeachers: teachers.length
    });
    
    // Create new attendance records
    const records = [];
    const teacherIdsToProcess = [];
    
    for (const record of validAttendanceData) {
      if (record.status && record.status !== 'unmarked') {
        const checkInTime = record.checkInTime ? new Date(record.checkInTime) : null;
        const checkOutTime = record.checkOutTime ? new Date(record.checkOutTime) : null;
        
        // Convert teacherId to ObjectId
        let teacherObjectId;
        try {
          teacherObjectId = mongoose.Types.ObjectId.isValid(record.teacherId) 
            ? new mongoose.Types.ObjectId(record.teacherId)
            : null;
          if (!teacherObjectId) {
            console.error('Invalid teacherId format:', record.teacherId);
            continue;
          }
        } catch (e) {
          console.error('Error converting teacherId to ObjectId:', record.teacherId, e);
          continue; // Skip this record
        }
        
        teacherIdsToProcess.push(teacherObjectId);
        
        // Create record object - DO NOT include student field at all for teacher records
        // This prevents conflicts with the old date_1_student_1 index
        // We'll use toObject() and delete the student field to ensure it's completely omitted
        const attendanceRecord = {
          date: attendanceDate,
          teacher: teacherObjectId,
          type: 'teacher',
          academicYear: academicYear || new Date().getFullYear().toString(),
          status: record.status,
          checkInTime: checkInTime,
          checkOutTime: checkOutTime,
          isLate: record.isLate || false,
          lateMinutes: record.lateMinutes || 0,
          isEarlyDeparture: record.isEarlyDeparture || false,
          earlyDepartureMinutes: record.earlyDepartureMinutes || 0,
          recordedBy: record.recordedBy || 'manual',
          machineId: record.machineId || null,
          machineRecordId: record.machineRecordId || null,
          remarks: record.remarks || '',
          isActive: true,
          createdBy: req.user._id
        };
        
        // CRITICAL: Explicitly delete student field if it exists (shouldn't, but just in case)
        delete attendanceRecord.student;
        
        records.push(attendanceRecord);
      }
    }
    
    console.log('📝 Records to save:', records.length);
    
    if (records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid attendance records to save. Please mark at least one teacher.'
      });
    }
    
    // Simple approach: Delete existing records, then create new ones individually
    // Delete ALL existing teacher records for this date first
    await Attendance.deleteMany({
      date: { $gte: attendanceDate, $lt: nextDay },
      type: 'teacher'
    });
    
    // Now create each record individually - simple and reliable
    const savedRecords = [];
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      try {
        // Delete any existing record for this specific teacher on this date first
        await Attendance.deleteOne({
          date: { $gte: attendanceDate, $lt: nextDay },
          type: 'teacher',
          teacher: record.teacher
        });
        
        // Try using the native MongoDB driver to insert without student field
        // This completely bypasses Mongoose and the problematic index
        const db = mongoose.connection.db;
        const collection = db.collection('attendances');
        
        // Create document without student field
        const docToInsert = {
          date: record.date,
          teacher: record.teacher,
          type: 'teacher',
          academicYear: record.academicYear,
          status: record.status,
          checkInTime: record.checkInTime,
          checkOutTime: record.checkOutTime,
          isLate: record.isLate,
          lateMinutes: record.lateMinutes,
          isEarlyDeparture: record.isEarlyDeparture,
          earlyDepartureMinutes: record.earlyDepartureMinutes,
          recordedBy: record.recordedBy,
          machineId: record.machineId,
          machineRecordId: record.machineRecordId,
          remarks: record.remarks,
          isActive: record.isActive,
          createdBy: record.createdBy,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // CRITICAL: Do NOT include student field at all
        // Insert using native driver
        const insertResult = await collection.insertOne(docToInsert);
        
        // Fetch the saved document using Mongoose for population
        const saved = await Attendance.findById(insertResult.insertedId)
          .populate('teacher', 'name teacherId email phone department')
          .populate('createdBy', 'name');
        
        if (saved) {
          savedRecords.push(saved);
          console.log(`✅ [${i + 1}/${records.length}] Saved attendance for teacher:`, record.teacher.toString(), '- Status:', record.status);
        } else {
          console.warn(`⚠️ [${i + 1}/${records.length}] Record inserted but not found:`, record.teacher.toString());
        }
      } catch (error) {
        console.error(`❌ [${i + 1}/${records.length}] Error saving record for teacher:`, record.teacher?.toString(), error.message);
        if (error.code === 11000) {
          console.error('  → Duplicate key error. Old index may still exist.');
        }
        // Continue with next record
      }
    }
    
    console.log('✅ Final result: Saved', savedRecords.length, 'of', records.length, 'teacher attendance records');
    
    if (savedRecords.length === 0) {
      throw new Error('Failed to save any attendance records. Please check server logs.');
    }
    
    // Fetch updated records
    const updatedRecords = await Attendance.find({
      date: { $gte: attendanceDate, $lt: nextDay },
      type: 'teacher'
    })
      .populate('teacher', 'name teacherId email phone department')
      .populate('createdBy', 'name')
      .sort({ 'teacher.name': 1 })
      .lean();
    
    console.log('📊 Returning teacher attendance data:', {
      totalTeachers: teacherIds.length,
      attendanceRecords: updatedRecords.length,
      savedCount: savedRecords.length,
      expectedCount: records.length,
      sampleTeacher: updatedRecords[0]?.teacher ? {
        name: updatedRecords[0].teacher.name,
        _id: updatedRecords[0].teacher._id.toString(),
        teacherId: updatedRecords[0].teacher.teacherId
      } : null
    });
    
    res.json({
      success: true,
      message: `Attendance marked for ${savedRecords.length} of ${records.length} teachers`,
      data: updatedRecords,
      savedCount: savedRecords.length,
      totalCount: records.length
    });
  } catch (error) {
    console.error('Error marking teacher attendance:', error);
    
    // Check if it's a duplicate key error related to the old index
    if (error.code === 11000 || (error.message && error.message.includes('E11000'))) {
      const errorDetails = error.keyPattern || error.keyValue || {};
      const isOldIndexError = errorDetails.student !== undefined || 
                              (error.message && error.message.includes('date_1_student_1'));
      
      if (isOldIndexError) {
        console.error('⚠️  Old index detected! The index "date_1_student_1" needs to be dropped.');
        console.error('📝 Run: node server/scripts/dropOldAttendanceIndex.js');
        console.error('📝 Or manually: db.attendances.dropIndex("date_1_student_1")');
        
        return res.status(500).json({ 
          success: false, 
          message: 'Database index conflict detected. Please run the index cleanup script: node server/scripts/dropOldAttendanceIndex.js',
          errorCode: 'INDEX_CONFLICT',
          instructions: {
            automatic: 'Run: node server/scripts/dropOldAttendanceIndex.js',
            manual: 'In MongoDB: db.attendances.dropIndex("date_1_student_1")',
            seeFile: 'DROP_OLD_ATTENDANCE_INDEX.md'
          }
        });
      }
    }
    
    console.error('Error details:', {
      name: error.name,
      code: error.code,
      message: error.message,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue
    });

    res.status(500).json({ 
        success: false,
      message: error.message || 'Failed to mark teacher attendance',
      errorCode: error.code
    });
  }
});

// Get today's attendance statistics (MUST be before /:id route)
router.get('/today-stats', async (req, res) => {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const { class: className, type } = req.query;
    
    // Build query based on filters
    const query = {
      date: { $gte: today, $lt: tomorrow }
    };
    
    // Determine type - if class is provided, it's for students
    let attendanceType = type;
    if (className && !type) {
      attendanceType = 'student';
    }
    
    if (attendanceType) {
      query.type = attendanceType;
    }

    if (className) {
      query.class = className;
    }

    // Get total students/teachers
    let totalPeople = 0;
    try {
      if (attendanceType === 'student') {
        if (className) {
          totalPeople = await Student.countDocuments({ class: className, isActive: true });
        } else {
          totalPeople = await Student.countDocuments({ isActive: true });
        }
      } else if (attendanceType === 'teacher') {
        totalPeople = await Teacher.countDocuments({ isActive: true });
      } else {
        // No type specified - count both students and teachers
        if (className) {
          // If class is provided but no type, assume students only
          totalPeople = await Student.countDocuments({ class: className, isActive: true });
        } else {
          const totalStudents = await Student.countDocuments({ isActive: true });
          const totalTeachers = await Teacher.countDocuments({ isActive: true });
          totalPeople = totalStudents + totalTeachers;
        }
      }
    } catch (countError) {
      console.error('Error counting people:', countError);
      console.error('Count error details:', countError.message);
      totalPeople = 0;
    }

    // Get today's attendance records
    let attendanceRecords = [];
    try {
      attendanceRecords = await Attendance.find(query).lean();
    } catch (attendanceError) {
      console.error('Error fetching attendance records:', attendanceError);
      console.error('Attendance error details:', attendanceError.message);
      attendanceRecords = [];
    }

    const present = attendanceRecords.filter(record => record.status === 'present').length;
    const absent = attendanceRecords.filter(record => record.status === 'absent').length;
    const late = attendanceRecords.filter(record => record.status === 'late').length;
    const excused = attendanceRecords.filter(record => record.status === 'excused').length;
    const halfDay = attendanceRecords.filter(record => record.status === 'half-day').length;
    const totalRecords = attendanceRecords.length; // Total attendance records marked today

    const stats = {
      totalPeople, // Total students/teachers (for calculating unmarked)
      totalRecords, // Total attendance records marked today
      present,
      absent,
      late,
      excused,
      halfDay,
      unmarked: Math.max(0, totalPeople - totalRecords)
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching today\'s attendance statistics:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Export attendance (CSV/Excel) - MUST be before /:id route
router.get('/export', async (req, res) => {
  try {
    // Apply same filters as GET /
    let filter = {};
    const andConditions = [];
    
    if (req.query.search) {
      const searchRegex = searchRegexFromQuery(req.query.search);
      if (searchRegex) {
        andConditions.push({
          $or: [
            { attendanceId: searchRegex },
            { remarks: searchRegex }
          ]
        });
      }
    }
    
    if (req.query.type) filter.type = req.query.type;
    if (req.query.student) filter.student = req.query.student;
    if (req.query.teacher) filter.teacher = req.query.teacher;
    if (req.query.class) filter.class = req.query.class;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.academicYear) filter.academicYear = req.query.academicYear;
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }
    
    if (req.query.dateFrom || req.query.dateTo) {
      filter.date = {};
      if (req.query.dateFrom) {
        const dateFrom = new Date(req.query.dateFrom);
        dateFrom.setUTCHours(0, 0, 0, 0);
        filter.date.$gte = dateFrom;
      }
      if (req.query.dateTo) {
        const dateTo = new Date(req.query.dateTo);
        dateTo.setUTCHours(23, 59, 59, 999);
        filter.date.$lte = dateTo;
      }
    }
    
    if (andConditions.length > 0) {
      filter = { $and: [filter, ...andConditions] };
    }
    
    const attendance = await Attendance.find(filter)
      .populate('student', 'name rollNumber studentId class')
      .populate('teacher', 'name teacherId department')
      .populate('createdBy', 'name')
      .sort({ date: -1 })
      .lean();
    
    const format = req.query.format || 'excel';
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=attendance.csv');
      
      const csvStream = fastcsv.format({ headers: true });
      csvStream.pipe(res);
      
      attendance.forEach(record => {
        csvStream.write({
          'Attendance ID': record.attendanceId || '',
          'Type': record.type || '',
          'Date': record.date ? new Date(record.date).toLocaleDateString() : '',
          'Student Name': record.student?.name || '',
          'Student ID': record.student?.studentId || '',
          'Roll Number': record.student?.rollNumber || '',
          'Teacher Name': record.teacher?.name || '',
          'Teacher ID': record.teacher?.teacherId || '',
          'Class': record.class || '',
          'Status': record.status || '',
          'Check In': record.checkInTime ? new Date(record.checkInTime).toLocaleString() : '',
          'Check Out': record.checkOutTime ? new Date(record.checkOutTime).toLocaleString() : '',
          'Late': record.isLate ? 'Yes' : 'No',
          'Late Minutes': record.lateMinutes || 0,
          'Early Departure': record.isEarlyDeparture ? 'Yes' : 'No',
          'Early Departure Minutes': record.earlyDepartureMinutes || 0,
          'Recorded By': record.recordedBy || '',
          'Machine ID': record.machineId || '',
          'Remarks': record.remarks || '',
          'Academic Year': record.academicYear || ''
        });
      });
      
      csvStream.end();
    } else {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Attendance');
      
      worksheet.columns = [
        { header: 'Attendance ID', key: 'attendanceId', width: 15 },
        { header: 'Type', key: 'type', width: 10 },
        { header: 'Date', key: 'date', width: 12 },
        { header: 'Student Name', key: 'studentName', width: 20 },
        { header: 'Student ID', key: 'studentId', width: 15 },
        { header: 'Roll Number', key: 'rollNumber', width: 12 },
        { header: 'Teacher Name', key: 'teacherName', width: 20 },
        { header: 'Teacher ID', key: 'teacherId', width: 15 },
        { header: 'Class', key: 'class', width: 10 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Check In', key: 'checkIn', width: 18 },
        { header: 'Check Out', key: 'checkOut', width: 18 },
        { header: 'Late', key: 'isLate', width: 8 },
        { header: 'Late Minutes', key: 'lateMinutes', width: 12 },
        { header: 'Early Departure', key: 'isEarlyDeparture', width: 15 },
        { header: 'Early Departure Minutes', key: 'earlyDepartureMinutes', width: 20 },
        { header: 'Recorded By', key: 'recordedBy', width: 12 },
        { header: 'Machine ID', key: 'machineId', width: 15 },
        { header: 'Remarks', key: 'remarks', width: 30 },
        { header: 'Academic Year', key: 'academicYear', width: 15 }
      ];
      
      attendance.forEach(record => {
        worksheet.addRow({
          attendanceId: record.attendanceId || '',
          type: record.type || '',
          date: record.date ? new Date(record.date).toLocaleDateString() : '',
          studentName: record.student?.name || '',
          studentId: record.student?.studentId || '',
          rollNumber: record.student?.rollNumber || '',
          teacherName: record.teacher?.name || '',
          teacherId: record.teacher?.teacherId || '',
          class: record.class || '',
          status: record.status || '',
          checkIn: record.checkInTime ? new Date(record.checkInTime).toLocaleString() : '',
          checkOut: record.checkOutTime ? new Date(record.checkOutTime).toLocaleString() : '',
          isLate: record.isLate ? 'Yes' : 'No',
          lateMinutes: record.lateMinutes || 0,
          isEarlyDeparture: record.isEarlyDeparture ? 'Yes' : 'No',
          earlyDepartureMinutes: record.earlyDepartureMinutes || 0,
          recordedBy: record.recordedBy || '',
          machineId: record.machineId || '',
          remarks: record.remarks || '',
          academicYear: record.academicYear || ''
        });
      });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=attendance.xlsx');
      
      await workbook.xlsx.write(res);
      res.end();
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Import attendance (CSV/Excel) - MUST be before /:id route
router.post('/import', multerExcel.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    
    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    const records = [];
    const errors = [];
    
    if (fileExtension === '.csv') {
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csvParser())
          .on('data', (row) => {
            try {
              // Map CSV columns to attendance fields
              const date = row['Date'] || row['date'] || row['DATE'];
              const studentId = row['Student ID'] || row['studentId'] || row['StudentId'];
              const teacherId = row['Teacher ID'] || row['teacherId'] || row['TeacherId'];
              const status = row['Status'] || row['status'] || row['STATUS'];
              const className = row['Class'] || row['class'] || row['CLASS'];
              
              if (!date || (!studentId && !teacherId) || !status) {
                errors.push({ row, error: 'Missing required fields' });
                return;
              }
              
              records.push({
                date: new Date(date),
                studentId: studentId || null,
                teacherId: teacherId || null,
                type: studentId ? 'student' : 'teacher',
                class: className || null,
                status: status.toLowerCase(),
                checkInTime: row['Check In'] || row['checkIn'] || null,
                checkOutTime: row['Check Out'] || row['checkOut'] || null,
                remarks: row['Remarks'] || row['remarks'] || ''
              });
            } catch (error) {
              errors.push({ row, error: error.message });
            }
          })
          .on('end', resolve)
          .on('error', reject);
      });
    } else {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      const worksheet = workbook.getWorksheet(1);
      
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header
        
        try {
          const date = row.getCell(3).value; // Date column
          const studentId = row.getCell(5).value; // Student ID column
          const teacherId = row.getCell(7).value; // Teacher ID column
          const status = row.getCell(10).value; // Status column
          const className = row.getCell(9).value; // Class column
          
          if (!date || (!studentId && !teacherId) || !status) {
            errors.push({ row: rowNumber, error: 'Missing required fields' });
            return;
          }
          
          records.push({
            date: date instanceof Date ? date : new Date(date),
            studentId: studentId || null,
            teacherId: teacherId || null,
            type: studentId ? 'student' : 'teacher',
            class: className || null,
            status: status.toString().toLowerCase(),
            checkInTime: row.getCell(11).value || null,
            checkOutTime: row.getCell(12).value || null,
            remarks: row.getCell(19).value || ''
          });
        } catch (error) {
          errors.push({ row: rowNumber, error: error.message });
        }
      });
    }
    
    // Process and insert records
    const created = [];
    const skipped = [];
    
    for (const record of records) {
      try {
        // Find student or teacher
        let person = null;
        if (record.type === 'student' && record.studentId) {
          person = await Student.findOne({ studentId: record.studentId });
        } else if (record.type === 'teacher' && record.teacherId) {
          person = await Teacher.findOne({ teacherId: record.teacherId });
        }
        
        if (!person) {
          skipped.push({ record, reason: 'Student/Teacher not found' });
          continue;
        }
        
        // Check if attendance already exists
        const date = new Date(record.date);
        date.setUTCHours(0, 0, 0, 0);
        const nextDay = new Date(date);
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);
        
        const existing = await Attendance.findOne({
          date: { $gte: date, $lt: nextDay },
          [record.type]: person._id
        });
        
        if (existing) {
          skipped.push({ record, reason: 'Attendance already exists for this date' });
          continue;
        }
        
        // Create attendance record
        const attendanceData = {
          date: date,
          [record.type]: person._id,
          type: record.type,
          class: record.class || (record.type === 'student' ? person.class : null),
          status: record.status,
          checkInTime: record.checkInTime ? new Date(record.checkInTime) : null,
          checkOutTime: record.checkOutTime ? new Date(record.checkOutTime) : null,
          remarks: record.remarks || '',
          isActive: true,
          createdBy: req.user._id
        };
        
        const attendance = await Attendance.create(attendanceData);
        created.push(attendance);
      } catch (error) {
        errors.push({ record, error: error.message });
      }
    }
    
    // Clean up uploaded file
    fs.unlinkSync(filePath);
    
    res.json({
      success: true,
      message: `Imported ${created.length} records, skipped ${skipped.length}, ${errors.length} errors`,
      data: {
        created: created.length,
        skipped: skipped.length,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined // Show first 10 errors
      }
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single attendance record
router.get('/:id', async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id)
      .populate('student', 'name rollNumber studentId email phone class')
      .populate('teacher', 'name teacherId email phone department')
      .populate('createdBy', 'name email');

    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }
    
    res.json({ success: true, data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update attendance record
router.put('/:id', async (req, res) => {
  try {
    const existingAttendance = await Attendance.findById(req.params.id);
    if (!existingAttendance) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }
    
    const updateData = {
      status: req.body.status !== undefined ? req.body.status : existingAttendance.status,
      checkInTime: req.body.checkInTime ? new Date(req.body.checkInTime) : existingAttendance.checkInTime,
      checkOutTime: req.body.checkOutTime ? new Date(req.body.checkOutTime) : existingAttendance.checkOutTime,
      isLate: req.body.isLate !== undefined ? req.body.isLate : existingAttendance.isLate,
      lateMinutes: req.body.lateMinutes !== undefined ? Number(req.body.lateMinutes) : existingAttendance.lateMinutes,
      isEarlyDeparture: req.body.isEarlyDeparture !== undefined ? req.body.isEarlyDeparture : existingAttendance.isEarlyDeparture,
      earlyDepartureMinutes: req.body.earlyDepartureMinutes !== undefined ? Number(req.body.earlyDepartureMinutes) : existingAttendance.earlyDepartureMinutes,
      remarks: req.body.remarks !== undefined ? req.body.remarks : existingAttendance.remarks,
      isActive: req.body.isActive !== undefined ? (req.body.isActive === 'true' || req.body.isActive === true) : existingAttendance.isActive
    };
    
    Object.assign(existingAttendance, updateData);
    const savedAttendance = await existingAttendance.save();
    
    const populatedAttendance = await Attendance.findById(savedAttendance._id)
      .populate('student', 'name rollNumber studentId email phone class')
      .populate('teacher', 'name teacherId email phone department')
      .populate('createdBy', 'name email');
    
    res.json({ success: true, data: populatedAttendance });
  } catch (error) {
    console.error('Error updating attendance:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete attendance record
router.delete('/:id', async (req, res) => {
  try {
    const attendance = await Attendance.findByIdAndDelete(req.params.id);
    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }
    res.json({ success: true, message: 'Attendance record deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Bulk update (activate/deactivate)
router.post('/bulk-update', async (req, res) => {
  try {
    const { ids, isActive } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide an array of attendance IDs' });
    }
    
    const result = await Attendance.updateMany(
      { _id: { $in: ids } },
      { $set: { isActive: isActive === true || isActive === 'true' } }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} attendance records updated`,
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
      return res.status(400).json({ success: false, message: 'Please provide an array of attendance IDs' });
    }
    
    const result = await Attendance.deleteMany({ _id: { $in: ids } });
    
    res.json({
      success: true,
      message: `${result.deletedCount} attendance records deleted`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get attendance statistics
router.get('/statistics/overview', async (req, res) => {
  try {
    const { class: className, dateFrom, dateTo, type, academicYear } = req.query;
    
    let filter = {};
    if (className) filter.class = className;
    if (type) filter.type = type;
    if (academicYear) filter.academicYear = academicYear;
    
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) {
        const dateFromObj = new Date(dateFrom);
        dateFromObj.setUTCHours(0, 0, 0, 0);
        filter.date.$gte = dateFromObj;
      }
      if (dateTo) {
        const dateToObj = new Date(dateTo);
        dateToObj.setUTCHours(23, 59, 59, 999);
        filter.date.$lte = dateToObj;
      }
    }
    
    const attendance = await Attendance.find(filter).lean();
    
    const totalRecords = attendance.length;
    const present = attendance.filter(a => a.status === 'present').length;
    const absent = attendance.filter(a => a.status === 'absent').length;
    const late = attendance.filter(a => a.status === 'late').length;
    const excused = attendance.filter(a => a.status === 'excused').length;
    const halfDay = attendance.filter(a => a.status === 'half-day').length;
    
    const presentPercentage = totalRecords > 0 ? (present / totalRecords) * 100 : 0;
    const absentPercentage = totalRecords > 0 ? (absent / totalRecords) * 100 : 0;
    
    // Get unique dates
    const uniqueDates = [...new Set(attendance.map(a => a.date.toISOString().split('T')[0]))].length;
    
    // Get students/teachers count
    let totalPeople = 0;
    if (type === 'student' && className) {
      totalPeople = await Student.countDocuments({ class: className, isActive: true });
    } else if (type === 'teacher') {
      totalPeople = await Teacher.countDocuments({ isActive: true });
    }
    
    res.json({
      success: true,
      data: {
        totalRecords,
        present,
        absent,
        late,
        excused,
        halfDay,
        presentPercentage: Math.round(presentPercentage * 100) / 100,
        absentPercentage: Math.round(absentPercentage * 100) / 100,
        uniqueDates,
        totalPeople,
        averageAttendance: totalPeople > 0 && uniqueDates > 0 ? Math.round((present / (totalPeople * uniqueDates)) * 100 * 100) / 100 : 0
      }
    });
  } catch (error) {
    console.error('Statistics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get attendance summary for a student/teacher
router.get('/summary/:personId', async (req, res) => {
  try {
    const { personId } = req.params;
    const { type, dateFrom, dateTo, academicYear } = req.query;
    
    if (!type || !['student', 'teacher'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Type (student or teacher) is required' });
    }
    
    let filter = {
      [type]: personId
    };
    
    if (academicYear) filter.academicYear = academicYear;
    
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) {
        const dateFromObj = new Date(dateFrom);
        dateFromObj.setUTCHours(0, 0, 0, 0);
        filter.date.$gte = dateFromObj;
      }
      if (dateTo) {
        const dateToObj = new Date(dateTo);
        dateToObj.setUTCHours(23, 59, 59, 999);
        filter.date.$lte = dateToObj;
      }
    }
    
    const attendance = await Attendance.find(filter)
      .populate(type, 'name')
      .sort({ date: -1 })
      .lean();
    
    const total = attendance.length;
    const present = attendance.filter(a => a.status === 'present').length;
    const absent = attendance.filter(a => a.status === 'absent').length;
    const late = attendance.filter(a => a.status === 'late').length;
    const excused = attendance.filter(a => a.status === 'excused').length;
    const halfDay = attendance.filter(a => a.status === 'half-day').length;
    
    const presentPercentage = total > 0 ? (present / total) * 100 : 0;

    res.json({
      success: true,
      data: {
        total,
        present,
        absent,
        late,
        excused,
        halfDay,
        presentPercentage: Math.round(presentPercentage * 100) / 100,
        records: attendance
      }
    });
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== ATTENDANCE MACHINE INTEGRATION ENDPOINTS ==========

// Endpoint for attendance machines to record attendance
router.post('/machine/record', async (req, res) => {
  try {
    const { 
      machineId, 
      machineRecordId, 
      personId, 
      personType, // 'student' or 'teacher'
      checkInTime, 
      checkOutTime,
      biometricData,
      date 
    } = req.body;
    
    if (!machineId || !personId || !personType || !checkInTime) {
      return res.status(400).json({
      success: false,
        message: 'Machine ID, person ID, person type, and check-in time are required'
      });
    }
    
    const attendanceDate = date ? new Date(date) : new Date();
    attendanceDate.setUTCHours(0, 0, 0, 0);
    const nextDay = new Date(attendanceDate);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    
    // Find the person (student or teacher)
    let person = null;
    let className = null;
    
    if (personType === 'student') {
      person = await Student.findById(personId);
      if (person) className = person.class;
    } else if (personType === 'teacher') {
      person = await Teacher.findById(personId);
    }
    
    if (!person) {
      return res.status(404).json({
        success: false,
        message: `${personType} not found`
      });
    }
    
    // Check if attendance already exists for this date
    const existing = await Attendance.findOne({
      date: { $gte: attendanceDate, $lt: nextDay },
      [personType]: personId
    });
    
    const checkIn = new Date(checkInTime);
    const checkOut = checkOutTime ? new Date(checkOutTime) : null;
    
    // Calculate if late (assuming school starts at 8:00 AM)
    const schoolStartTime = new Date(attendanceDate);
    schoolStartTime.setUTCHours(8, 0, 0, 0);
    const isLate = checkIn > schoolStartTime;
    const lateMinutes = isLate ? Math.floor((checkIn - schoolStartTime) / 60000) : 0;
    
    // Calculate if early departure (assuming school ends at 3:00 PM)
    const schoolEndTime = new Date(attendanceDate);
    schoolEndTime.setUTCHours(15, 0, 0, 0);
    const isEarlyDeparture = checkOut && checkOut < schoolEndTime;
    const earlyDepartureMinutes = isEarlyDeparture ? Math.floor((schoolEndTime - checkOut) / 60000) : 0;
    
    // Determine status
    let status = 'present';
    if (isLate) status = 'late';
    if (checkOut && isEarlyDeparture) {
      status = 'half-day';
    }
    
    if (existing) {
      // Update existing record
      existing.checkInTime = checkIn;
      existing.checkOutTime = checkOut;
      existing.isLate = isLate;
      existing.lateMinutes = lateMinutes;
      existing.isEarlyDeparture = isEarlyDeparture;
      existing.earlyDepartureMinutes = earlyDepartureMinutes;
      existing.status = status;
      existing.recordedBy = 'machine';
      existing.machineId = machineId;
      existing.machineRecordId = machineRecordId;
      existing.biometricData = biometricData || existing.biometricData;
      
      await existing.save();
      
      const populated = await Attendance.findById(existing._id)
        .populate('student', 'name rollNumber studentId class')
        .populate('teacher', 'name teacherId department');
      
      return res.json({
        success: true,
        message: 'Attendance updated from machine',
        data: populated
      });
    } else {
      // Create new record
      const attendance = await Attendance.create({
        date: attendanceDate,
        [personType]: personId,
        type: personType,
        class: className,
        status: status,
        checkInTime: checkIn,
        checkOutTime: checkOut,
        isLate: isLate,
        lateMinutes: lateMinutes,
        isEarlyDeparture: isEarlyDeparture,
        earlyDepartureMinutes: earlyDepartureMinutes,
        recordedBy: 'machine',
        machineId: machineId,
        machineRecordId: machineRecordId,
        biometricData: biometricData,
        academicYear: new Date().getFullYear().toString(),
        isActive: true
      });
      
      const populated = await Attendance.findById(attendance._id)
        .populate('student', 'name rollNumber studentId class')
        .populate('teacher', 'name teacherId department');
      
      return res.json({
        success: true,
        message: 'Attendance recorded from machine',
        data: populated
      });
    }
  } catch (error) {
    console.error('Machine record error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get attendance machine records
router.get('/machine/records', async (req, res) => {
  try {
    const { machineId, dateFrom, dateTo } = req.query;
    
    let filter = { recordedBy: 'machine' };
    if (machineId) filter.machineId = machineId;
    
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) {
        const dateFromObj = new Date(dateFrom);
        dateFromObj.setUTCHours(0, 0, 0, 0);
        filter.date.$gte = dateFromObj;
      }
      if (dateTo) {
        const dateToObj = new Date(dateTo);
        dateToObj.setUTCHours(23, 59, 59, 999);
        filter.date.$lte = dateToObj;
      }
    }
    
    const records = await Attendance.find(filter)
      .populate('student', 'name rollNumber studentId class')
      .populate('teacher', 'name teacherId department')
      .sort({ date: -1, checkInTime: -1 })
      .lean();
    
    res.json({
      success: true,
      data: records
    });
  } catch (error) {
    console.error('Machine records error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Sync attendance from machine (bulk)
router.post('/machine/sync', async (req, res) => {
  try {
    const { machineId, records } = req.body;
    
    if (!machineId || !records || !Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        message: 'Machine ID and records array are required'
      });
    }
    
    const synced = [];
    const errors = [];
    
    for (const record of records) {
      try {
        // Use the same logic as /machine/record
        const attendanceDate = record.date ? new Date(record.date) : new Date();
        attendanceDate.setUTCHours(0, 0, 0, 0);
        const nextDay = new Date(attendanceDate);
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);
        
        let person = null;
        let className = null;
        const personType = record.personType || 'student';
        
        if (personType === 'student') {
          person = await Student.findById(record.personId);
          if (person) className = person.class;
        } else {
          person = await Teacher.findById(record.personId);
        }
        
        if (!person) {
          errors.push({ record, error: `${personType} not found` });
          continue;
        }
        
        const existing = await Attendance.findOne({
          date: { $gte: attendanceDate, $lt: nextDay },
          [personType]: record.personId
        });
        
        const checkIn = new Date(record.checkInTime);
        const checkOut = record.checkOutTime ? new Date(record.checkOutTime) : null;
        
        const schoolStartTime = new Date(attendanceDate);
        schoolStartTime.setUTCHours(8, 0, 0, 0);
        const isLate = checkIn > schoolStartTime;
        const lateMinutes = isLate ? Math.floor((checkIn - schoolStartTime) / 60000) : 0;
        
        const schoolEndTime = new Date(attendanceDate);
        schoolEndTime.setUTCHours(15, 0, 0, 0);
        const isEarlyDeparture = checkOut && checkOut < schoolEndTime;
        const earlyDepartureMinutes = isEarlyDeparture ? Math.floor((schoolEndTime - checkOut) / 60000) : 0;
        
        let status = 'present';
        if (isLate) status = 'late';
        if (checkOut && isEarlyDeparture) status = 'half-day';
        
        if (existing) {
          existing.checkInTime = checkIn;
          existing.checkOutTime = checkOut;
          existing.isLate = isLate;
          existing.lateMinutes = lateMinutes;
          existing.isEarlyDeparture = isEarlyDeparture;
          existing.earlyDepartureMinutes = earlyDepartureMinutes;
          existing.status = status;
          existing.recordedBy = 'machine';
          existing.machineId = machineId;
          existing.machineRecordId = record.machineRecordId;
          existing.biometricData = record.biometricData;
          await existing.save();
          synced.push(existing);
        } else {
          const attendance = await Attendance.create({
            date: attendanceDate,
            [personType]: record.personId,
            type: personType,
            class: className,
            status: status,
            checkInTime: checkIn,
            checkOutTime: checkOut,
            isLate: isLate,
            lateMinutes: lateMinutes,
            isEarlyDeparture: isEarlyDeparture,
            earlyDepartureMinutes: earlyDepartureMinutes,
            recordedBy: 'machine',
            machineId: machineId,
            machineRecordId: record.machineRecordId,
            biometricData: record.biometricData,
            academicYear: new Date().getFullYear().toString(),
            isActive: true
          });
          synced.push(attendance);
        }
      } catch (error) {
        errors.push({ record, error: error.message });
      }
    }
    
    res.json({
      success: true,
      message: `Synced ${synced.length} records, ${errors.length} errors`,
      data: {
        synced: synced.length,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined
      }
    });
  } catch (error) {
    console.error('Machine sync error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router; 
