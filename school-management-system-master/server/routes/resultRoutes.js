const express = require('express');
const router = express.Router();
const Result = require('../models/Result');
const { protect } = require('../middleware/auth');

// @desc    Get all results
// @route   GET /api/results
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const results = await Result.find()
      .populate('student', 'name rollNumber class')
      .sort({ examDate: -1 });

    res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching results'
    });
  }
});

// @desc    Get results by student ID
// @route   GET /api/results/student/:studentId
// @access  Private
router.get('/student/:studentId', protect, async (req, res) => {
  try {
    const results = await Result.find({ student: req.params.studentId })
      .sort({ examDate: -1 });

    res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    console.error('Error fetching student results:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching student results'
    });
  }
});

// @desc    Get results by class
// @route   GET /api/results/class/:classId
// @access  Private
router.get('/class/:classId', protect, async (req, res) => {
  try {
    // First, find all students in the class
    const Student = require('../models/Student');
    const students = await Student.find({ class: req.params.classId }).select('_id');
    const studentIds = students.map(student => student._id);
    
    // Then find all results for these students
    const results = await Result.find({ student: { $in: studentIds } })
      .populate('student', 'name rollNumber')
      .sort({ examDate: -1 });

    res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    console.error('Error fetching class results:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching class results'
    });
  }
});

// @desc    Get a single result
// @route   GET /api/results/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const result = await Result.findById(req.params.id)
      .populate('student', 'name rollNumber class');

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Result not found'
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching result:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching result'
    });
  }
});

// @desc    Create a new result
// @route   POST /api/results
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { student, subject, score, examDate, remarks } = req.body;

    // Validate required fields
    if (!student || !subject || score === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide student, subject, and score'
      });
    }

    // Create the result
    const result = await Result.create({
      student,
      subject,
      score,
      examDate: examDate || Date.now(),
      remarks
    });

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error creating result:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating result'
    });
  }
});

// @desc    Update a result
// @route   PUT /api/results/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const { subject, score, examDate, remarks } = req.body;

    // Find the result
    let result = await Result.findById(req.params.id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Result not found'
      });
    }

    // Update fields
    if (subject) result.subject = subject;
    if (score !== undefined) result.score = score;
    if (examDate) result.examDate = examDate;
    if (remarks !== undefined) result.remarks = remarks;

    // Save the updated result
    await result.save();

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error updating result:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating result'
    });
  }
});

// @desc    Delete a result
// @route   DELETE /api/results/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const result = await Result.findById(req.params.id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Result not found'
      });
    }

    await result.deleteOne();

    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error deleting result:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting result'
    });
  }
});

module.exports = router; 