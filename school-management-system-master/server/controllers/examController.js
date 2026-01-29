const Exam = require('../models/Exam');

// Get all exams
exports.getAllExams = async (req, res) => {
  try {
    const exams = await Exam.find().sort({ date: 1 });
    res.json(exams);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching exams', error: error.message });
  }
};

// Get single exam
exports.getExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    res.json(exam);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching exam', error: error.message });
  }
};

// Create new exam
exports.createExam = async (req, res) => {
  try {
    const exam = new Exam({
      ...req.body,
      createdBy: req.user._id
    });
    await exam.save();
    res.status(201).json(exam);
  } catch (error) {
    res.status(400).json({ message: 'Error creating exam', error: error.message });
  }
};

// Update exam
exports.updateExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Check if user is authorized to update the exam
    if (exam.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this exam' });
    }

    const updatedExam = await Exam.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );
    res.json(updatedExam);
  } catch (error) {
    res.status(400).json({ message: 'Error updating exam', error: error.message });
  }
};

// Delete exam
exports.deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Check if user is authorized to delete the exam
    if (exam.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this exam' });
    }

    await exam.remove();
    res.json({ message: 'Exam deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting exam', error: error.message });
  }
}; 