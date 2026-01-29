const ExamMark = require('../models/ExamMark');
const Student = require('../models/Student');
const Exam = require('../models/Exam');
const asyncHandler = require('express-async-handler');

// Get all exam marks
exports.getAllExamMarks = async (req, res) => {
  try {
    const examMarks = await ExamMark.find()
      .populate('student', 'name rollNumber')
      .populate('exam', 'examName');
    res.status(200).json(examMarks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get exam marks by student
exports.getExamMarksByStudent = async (req, res) => {
  try {
    const examMarks = await ExamMark.find({ student: req.params.studentId })
      .populate('student', 'name rollNumber')
      .populate('exam', 'examName');
    res.status(200).json(examMarks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get exam marks by class and term
exports.getExamMarksByClassAndTerm = async (req, res) => {
  try {
    const { class: className, term, academicYear } = req.params;
    const examMarks = await ExamMark.find({
      class: className,
      term,
      academicYear
    })
      .populate('student', 'name rollNumber')
      .populate('exam', 'examName');
    res.status(200).json(examMarks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create exam marks
exports.createExamMarks = async (req, res) => {
  try {
    const examMark = new ExamMark({
      ...req.body,
      createdBy: req.user._id
    });
    const savedExamMark = await examMark.save();
    res.status(201).json(savedExamMark);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update exam marks
exports.updateExamMarks = async (req, res) => {
  try {
    const examMark = await ExamMark.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!examMark) {
      return res.status(404).json({ message: 'Exam marks not found' });
    }
    res.status(200).json(examMark);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete exam marks
exports.deleteExamMarks = async (req, res) => {
  try {
    const examMark = await ExamMark.findByIdAndDelete(req.params.id);
    if (!examMark) {
      return res.status(404).json({ message: 'Exam marks not found' });
    }
    res.status(200).json({ message: 'Exam marks deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Generate final report card
exports.generateFinalReport = async (req, res) => {
  try {
    const { studentId, academicYear } = req.params;
    
    // Get all exam marks for the student in the academic year
    const examMarks = await ExamMark.find({
      student: studentId,
      academicYear
    }).populate('exam', 'examName');
    
    // Calculate total marks and average for each term
    const termResults = {};
    examMarks.forEach(mark => {
      if (!termResults[mark.term]) {
        termResults[mark.term] = {
          totalMarks: 0,
          obtainedMarks: 0,
          subjects: 0
        };
      }
      termResults[mark.term].totalMarks += mark.totalMarks;
      termResults[mark.term].obtainedMarks += mark.marksObtained;
      termResults[mark.term].subjects += 1;
    });
    
    // Calculate final result
    const finalResult = {
      student: examMarks[0]?.student,
      academicYear,
      termResults: Object.keys(termResults).map(term => ({
        term,
        totalMarks: termResults[term].totalMarks,
        obtainedMarks: termResults[term].obtainedMarks,
        percentage: (termResults[term].obtainedMarks / termResults[term].totalMarks) * 100,
        subjects: termResults[term].subjects
      })),
      subjectMarks: examMarks.map(mark => ({
        subject: mark.subject,
        term: mark.term,
        marksObtained: mark.marksObtained,
        totalMarks: mark.totalMarks,
        grade: mark.grade
      }))
    };
    
    res.status(200).json(finalResult);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Check if marks exist for a student in a subject, term and academic year
exports.checkExistingMarks = asyncHandler(async (req, res) => {
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
      message: 'Marks already exist for this combination'
    });
  }

  res.status(200).json({
    exists: false,
    message: 'No existing marks found'
  });
});

// Get filtered exam marks
exports.getFilteredExamMarks = asyncHandler(async (req, res) => {
  const { class: className, academicYear } = req.query;
  console.log('Filter params:', { className, academicYear });

  const query = {};
  if (className) query.class = className;
  if (academicYear) query.academicYear = academicYear;

  console.log('Constructed query:', query);

  const examMarks = await ExamMark.find(query)
    .populate('student', 'name rollNumber')
    .populate('exam', 'examName')
    .sort({ 'student.name': 1, term: 1 });

  console.log(`Found ${examMarks.length} marks`);
  res.status(200).json(examMarks);
}); 