const AcademicYear = require('../models/AcademicYear');

// Get all academic years
exports.getAllAcademicYears = async (req, res) => {
  try {
    const academicYears = await AcademicYear.find().sort({ year: -1 });
    res.status(200).json({
      success: true,
      data: academicYears
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get active academic year
exports.getActiveAcademicYear = async (req, res) => {
  try {
    const activeYear = await AcademicYear.findOne({ isActive: true });
    res.status(200).json(activeYear);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create academic year
exports.createAcademicYear = async (req, res) => {
  try {
    // If this is the first academic year or explicitly set as active
    if (req.body.isActive) {
      // Deactivate all other academic years
      await AcademicYear.updateMany({}, { isActive: false });
    }
    
    const academicYear = new AcademicYear({
      ...req.body,
      createdBy: req.user._id
    });
    const savedAcademicYear = await academicYear.save();
    res.status(201).json(savedAcademicYear);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update academic year
exports.updateAcademicYear = async (req, res) => {
  try {
    // If setting this year as active, deactivate others
    if (req.body.isActive) {
      await AcademicYear.updateMany(
        { _id: { $ne: req.params.id } },
        { isActive: false }
      );
    }
    
    const academicYear = await AcademicYear.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!academicYear) {
      return res.status(404).json({ message: 'Academic year not found' });
    }
    res.status(200).json(academicYear);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete academic year
exports.deleteAcademicYear = async (req, res) => {
  try {
    const academicYear = await AcademicYear.findByIdAndDelete(req.params.id);
    if (!academicYear) {
      return res.status(404).json({ message: 'Academic year not found' });
    }
    res.status(200).json({ message: 'Academic year deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 