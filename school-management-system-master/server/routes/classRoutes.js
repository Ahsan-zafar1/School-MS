const express = require('express');
const router = express.Router();
const Class = require('../models/Class');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const { protect } = require('../middleware/auth');
const fastcsv = require('fast-csv');
const csvParser = require('csv-parser');
const ExcelJS = require('exceljs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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

// Get all classes with pagination, sorting, and filtering (MUST be before /:id route)
router.get('/', protect, async (req, res) => {
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

    // Search filter (name, section, classId, roomNumber)
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      andConditions.push({
        $or: [
          { name: searchRegex },
          { section: searchRegex },
          { classId: searchRegex },
          { roomNumber: searchRegex }
        ]
      });
    }

    // Grade filter - can filter by grade field or by class name
    if (req.query.grade) {
      const gradeValue = req.query.grade.trim();
      // Escape special regex characters
      const escapedGrade = gradeValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Try to match by grade field OR by class name (exact match or starts with)
      // This handles cases where classes like "KG", "Nursary" don't have a grade field
      const gradeFilter = {
        $or: [
          { grade: gradeValue },
          { name: gradeValue }, // Exact match for class name
          { name: { $regex: new RegExp(`^${escapedGrade}`, 'i') } } // Match class names starting with the grade
        ]
      };
      andConditions.push(gradeFilter);
    }

    // Status filter
    if (req.query.status !== undefined && req.query.status !== '') {
      filter.isActive = req.query.status === 'true' || req.query.status === 'active';
    }

    // Academic year filter
    if (req.query.academicYear) {
      filter.academicYear = req.query.academicYear;
    }

    // Capacity range filters
    if (req.query.capacityMin) {
      filter.capacity = { ...filter.capacity, $gte: parseInt(req.query.capacityMin) };
    }
    if (req.query.capacityMax) {
      filter.capacity = { ...filter.capacity, $lte: parseInt(req.query.capacityMax) };
    }

    // Class teacher filter
    if (req.query.teacher) {
      filter.classTeacher = req.query.teacher;
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
    const total = await Class.countDocuments(filter);

    // Calculate pagination info
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Fetch classes with pagination
    const classes = await Class.find(filter)
      .populate('classTeacher', 'name email phone')
      .populate('students', 'name rollNumber')
      .populate('subjects.teacher', 'name')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Calculate current students count for each class by querying Student collection
    // This is more reliable than relying on the students array in Class document
    const classesWithCounts = await Promise.all(classes.map(async (cls) => {
      // Count students where class field matches the class name
      const studentCount = await Student.countDocuments({ 
        class: cls.name,
        isActive: true // Only count active students
      });
      
      return {
        ...cls,
        currentStudents: studentCount
      };
    }));

    res.json({
      success: true,
      data: classesWithCounts,
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
    console.error('Error fetching classes:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching classes',
      error: error.message
    });
  }
});

// Export classes as CSV or Excel (MUST be before /:id route)
router.get('/export', protect, async (req, res) => {
  try {
    const format = req.query.format || 'csv'; // csv or excel
    
    // Build query with optional filters (same as GET /)
    let filter = {};
    const andConditions = [];
    
    // Search filter
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      andConditions.push({
        $or: [
          { name: searchRegex },
          { section: searchRegex },
          { classId: searchRegex },
          { roomNumber: searchRegex }
        ]
      });
    }
    
    // Grade filter - can filter by grade field or by class name (same logic as GET /)
    if (req.query.grade) {
      const gradeValue = req.query.grade.trim();
      // Escape special regex characters
      const escapedGrade = gradeValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Try to match by grade field OR by class name (exact match or starts with)
      const gradeFilter = {
        $or: [
          { grade: gradeValue },
          { name: gradeValue }, // Exact match for class name
          { name: { $regex: new RegExp(`^${escapedGrade}`, 'i') } } // Match class names starting with the grade
        ]
      };
      andConditions.push(gradeFilter);
    }
    
    // Status filter
    if (req.query.status !== undefined && req.query.status !== '') {
      filter.isActive = req.query.status === 'true' || req.query.status === 'active';
    }
    
    // Academic year filter
    if (req.query.academicYear) {
      filter.academicYear = req.query.academicYear;
    }
    
    // Combine all conditions properly
    if (andConditions.length > 0) {
      if (Object.keys(filter).length > 0) {
        filter = { $and: [filter, ...andConditions] };
      } else {
        filter = andConditions.length === 1 ? andConditions[0] : { $and: andConditions };
      }
    }
    
    const classes = await Class.find(filter)
      .populate('classTeacher', 'name')
      .populate('students', 'name')
      .lean();
    
    if (!classes.length) {
      return res.status(404).json({ success: false, message: 'No classes found to export' });
    }
    
    // Calculate current students count for each class by querying Student collection
    const classesWithCounts = await Promise.all(classes.map(async (cls) => {
      const studentCount = await Student.countDocuments({ 
        class: cls.name,
        isActive: true // Only count active students
      });
      return {
        ...cls,
        currentStudents: studentCount
      };
    }));
    
    const fields = [
      'classId', 'name', 'grade', 'section', 'capacity', 'currentStudents', 'teacher', 
      'roomNumber', 'academicYear', 'isActive', 'subjects', 'description'
    ];
    
    if (format === 'excel' || format === 'xlsx') {
      // Export as Excel
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Classes');
      
      worksheet.columns = [
        { header: 'Tracking ID', key: 'classId', width: 15 },
        { header: 'Name', key: 'name', width: 20 },
        { header: 'Grade', key: 'grade', width: 10 },
        { header: 'Section', key: 'section', width: 10 },
        { header: 'Capacity', key: 'capacity', width: 12 },
        { header: 'Current Students', key: 'currentStudents', width: 15 },
        { header: 'Teacher', key: 'teacher', width: 25 },
        { header: 'Room Number', key: 'roomNumber', width: 15 },
        { header: 'Academic Year', key: 'academicYear', width: 15 },
        { header: 'Status', key: 'isActive', width: 10 },
        { header: 'Subjects', key: 'subjects', width: 40 },
        { header: 'Description', key: 'description', width: 40 }
      ];
      
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      
      classesWithCounts.forEach(cls => {
        const row = {
          classId: cls.classId || '',
          name: cls.name || '',
          grade: cls.grade || '',
          section: cls.section || '',
          capacity: cls.capacity || 0,
          currentStudents: cls.currentStudents || 0,
          teacher: cls.classTeacher?.name || '',
          roomNumber: cls.roomNumber || '',
          academicYear: cls.academicYear || '',
          isActive: cls.isActive ? 'Active' : 'Inactive',
          subjects: Array.isArray(cls.subjects) ? cls.subjects.map(s => s.name || s).join(', ') : '',
          description: cls.description || ''
        };
        worksheet.addRow(row);
      });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=classes.xlsx');
      
      await workbook.xlsx.write(res);
      res.end();
    } else {
      // Export as CSV
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=classes-${new Date().toISOString().split('T')[0]}.csv`);
      
      res.write('\ufeff'); // BOM for UTF-8
      
      fastcsv
        .write(classesWithCounts.map(c => {
          const obj = {};
          fields.forEach(f => {
            if (f === 'teacher') {
              obj[f] = c.classTeacher?.name || '';
            } else if (f === 'subjects') {
              obj[f] = Array.isArray(c.subjects) ? c.subjects.map(s => s.name || s).join(', ') : '';
            } else if (f === 'currentStudents') {
              obj[f] = c.currentStudents || 0;
            } else if (f === 'isActive') {
              obj[f] = c.isActive ? 'Active' : 'Inactive';
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
    console.error('Error exporting classes:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        message: 'Error exporting classes', 
        error: error.message 
      });
    }
  }
});

// Get single class by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const classData = await Class.findById(req.params.id)
      .populate('classTeacher', 'name email phone')
      .populate('students', 'name rollNumber email')
      .populate('subjects.teacher', 'name email')
      .populate('schedule.periods.teacher', 'name')
      .lean();

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Count students by querying Student collection where class field matches class name
    const studentCount = await Student.countDocuments({ 
      class: classData.name,
      isActive: true // Only count active students
    });

    // Add currentStudents count to the response
    const classDataWithCount = {
      ...classData,
      currentStudents: studentCount
    };

    res.json({
      success: true,
      data: classDataWithCount
    });
  } catch (error) {
    console.error('Error fetching class:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching class details',
      error: error.message
    });
  }
});

// Create new class
router.post('/', protect, async (req, res) => {
  try {
    // Check for duplicate class
    const existingClass = await Class.findOne({
      name: req.body.name,
      section: req.body.section,
      academicYear: req.body.academicYear
    });

    if (existingClass) {
      return res.status(400).json({
        success: false,
        message: 'Class with this name, section and academic year already exists'
      });
    }

    // Convert isActive from string to boolean if needed
    const classDataToCreate = { ...req.body };
    if (classDataToCreate.isActive !== undefined && typeof classDataToCreate.isActive === 'string') {
      classDataToCreate.isActive = classDataToCreate.isActive === 'true' || classDataToCreate.isActive === 'True';
    }

    const classData = await Class.create(classDataToCreate);
    
    // If teacher is assigned, update teacher's classes
    if (req.body.classTeacher) {
      await Teacher.findByIdAndUpdate(
        req.body.classTeacher,
        { $addToSet: { classes: classData._id } }
      );
    }

    const populatedClass = await Class.findById(classData._id)
      .populate('classTeacher', 'name email phone')
      .populate('subjects.teacher', 'name');

    res.status(201).json({
      success: true,
      data: populatedClass
    });
  } catch (error) {
    console.error('Error creating class:', error);
    res.status(400).json({
      success: false,
      message: 'Error creating class',
      error: error.message
    });
  }
});

// Update class
router.put('/:id', protect, async (req, res) => {
  try {
    const classData = await Class.findById(req.params.id);
    
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Convert isActive from string to boolean if needed
    const updateData = { ...req.body };
    if (updateData.isActive !== undefined && typeof updateData.isActive === 'string') {
      updateData.isActive = updateData.isActive === 'true' || updateData.isActive === 'True';
    }

    // If class teacher is being changed, update teacher records
    if (req.body.classTeacher && req.body.classTeacher !== classData.classTeacher?.toString()) {
      // Remove class from old teacher's classes
      if (classData.classTeacher) {
        await Teacher.findByIdAndUpdate(
          classData.classTeacher,
          { $pull: { classes: classData._id } }
        );
      }
      // Add class to new teacher's classes
      await Teacher.findByIdAndUpdate(
        req.body.classTeacher,
        { $addToSet: { classes: classData._id } }
      );
    }

    const updatedClass = await Class.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('classTeacher', 'name email phone')
    .populate('subjects.teacher', 'name');

    res.json({
      success: true,
      data: updatedClass
    });
  } catch (error) {
    console.error('Error updating class:', error);
    res.status(400).json({
      success: false,
      message: 'Error updating class',
      error: error.message
    });
  }
});

// Delete class
router.delete('/:id', protect, async (req, res) => {
  try {
    const classData = await Class.findById(req.params.id);

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Remove class reference from teacher if exists
    if (classData.classTeacher) {
      await Teacher.findByIdAndUpdate(
        classData.classTeacher,
        { $pull: { classes: classData._id } }
      );
    }

    // Update students' class field to null
    if (classData.students && classData.students.length > 0) {
      await Student.updateMany(
        { _id: { $in: classData.students } },
        { $unset: { class: "" } }
      );
    }

    // Delete the class
    await Class.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Class deleted successfully',
      data: {}
    });
  } catch (error) {
    console.error('Error deleting class:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting class',
      error: error.message
    });
  }
});

// Add students to class
router.post('/:id/students', protect, async (req, res) => {
  try {
    const { studentIds } = req.body;
    const classData = await Class.findById(req.params.id);

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Add students to class
    classData.students = studentIds;
    await classData.save();

    // Update students' class field
    await Student.updateMany(
      { _id: { $in: studentIds } },
      { class: classData.name }
    );

    // Remove class from students that were unassigned
    await Student.updateMany(
      { 
        _id: { $nin: studentIds },
        class: classData.name
      },
      { $unset: { class: "" } }
    );

    const updatedClass = await Class.findById(req.params.id)
      .populate('students', 'name rollNumber email class');

    res.json({
      success: true,
      data: updatedClass
    });
  } catch (error) {
    console.error('Error adding students to class:', error);
    res.status(400).json({
      success: false,
      message: 'Error adding students to class',
      error: error.message
    });
  }
});

// Remove students from class
router.delete('/:id/students', protect, async (req, res) => {
  try {
    const { studentIds } = req.body;
    const classData = await Class.findById(req.params.id);

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Remove students from class
    classData.students = classData.students.filter(
      id => !studentIds.includes(id.toString())
    );
    await classData.save();

    // Update students' class field
    await Student.updateMany(
      { _id: { $in: studentIds } },
      { $unset: { class: "" } }
    );

    const updatedClass = await Class.findById(req.params.id)
      .populate('students', 'name rollNumber');

    res.json({
      success: true,
      data: updatedClass
    });
  } catch (error) {
    console.error('Error removing students from class:', error);
    res.status(400).json({
      success: false,
      message: 'Error removing students from class',
      error: error.message
    });
  }
});

// Get class statistics
router.get('/:id/statistics', protect, async (req, res) => {
  try {
    const classData = await Class.findById(req.params.id)
      .populate('students', 'name')
      .populate('subjects.teacher', 'name');

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    const statistics = {
      totalStudents: classData.students.length,
      totalSubjects: classData.subjects.length,
      classTeacher: classData.classTeacher ? await Teacher.findById(classData.classTeacher).select('name') : null,
      capacity: classData.capacity,
      availableSeats: classData.capacity - classData.students.length,
      subjects: classData.subjects.map(subject => ({
        name: subject.name,
        teacher: subject.teacher ? subject.teacher.name : 'Not Assigned'
      }))
    };

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Error fetching class statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching class statistics',
      error: error.message
    });
  }
});

module.exports = router; 