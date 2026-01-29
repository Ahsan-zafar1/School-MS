const express = require('express');
const router = express.Router();
const AcademicYear = require('../models/AcademicYear');
const { protect } = require('../middleware/auth');

// Get all academic years
router.get('/', protect, async (req, res, next) => {
  try {
    const academicYears = await AcademicYear.find().sort({ year: -1 });
    res.json(academicYears);
  } catch (error) {
    next(error);
  }
});

// Create new academic year
router.post('/', protect, async (req, res, next) => {
  try {
    const { year, startDate, endDate } = req.body;
    const academicYear = new AcademicYear({
      year,
      startDate,
      endDate,
      createdBy: req.user._id
    });
    await academicYear.save();
    res.status(201).json(academicYear);
  } catch (error) {
    next(error);
  }
});

// Update academic year
router.put('/:id', protect, async (req, res, next) => {
  try {
    const academicYear = await AcademicYear.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!academicYear) {
      return res.status(404).json({ message: 'Academic year not found' });
    }
    res.json(academicYear);
  } catch (error) {
    next(error);
  }
});

// Delete academic year
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const academicYear = await AcademicYear.findByIdAndDelete(req.params.id);
    if (!academicYear) {
      return res.status(404).json({ message: 'Academic year not found' });
    }
    res.json({ message: 'Academic year deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 