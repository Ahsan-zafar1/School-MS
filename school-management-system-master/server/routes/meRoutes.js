const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Fee = require('../models/Fee');
const ExamMark = require('../models/ExamMark');
const Attendance = require('../models/Attendance');
const Exam = require('../models/Exam');

// Resolve linked Student or Teacher by logged-in user email
const getLinkedStudent = async (email) => {
  if (!email) return null;
  return Student.findOne({ email: email.toLowerCase(), isActive: true }).lean();
};
const getLinkedTeacher = async (email) => {
  if (!email) return null;
  return Teacher.findOne({ email: email.toLowerCase(), isActive: true }).lean();
};

// All /api/me routes require authentication
router.use(protect);

/**
 * GET /api/me/profile
 * Returns the current user's linked Student or Teacher record (by email).
 * Admin gets 403 for this endpoint (use admin panels instead).
 */
router.get('/profile', async (req, res) => {
  try {
    const { role, email } = req.user;
    if (role === 'admin') {
      return res.status(403).json({ success: false, message: 'Admins use the main dashboard.' });
    }
    if (role === 'student') {
      const student = await getLinkedStudent(email);
      if (!student) {
        return res.status(404).json({ success: false, message: 'No student record linked to this account.' });
      }
      return res.json({ success: true, data: student });
    }
    if (role === 'teacher') {
      const teacher = await getLinkedTeacher(email);
      if (!teacher) {
        return res.status(404).json({ success: false, message: 'No teacher record linked to this account.' });
      }
      return res.json({ success: true, data: teacher });
    }
    return res.status(403).json({ success: false, message: 'Unknown role.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/me/fees
 * Student only: returns fees for the linked student.
 */
router.get('/fees', async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Students only.' });
    }
    const student = await getLinkedStudent(req.user.email);
    if (!student) {
      return res.status(404).json({ success: false, message: 'No student record linked.' });
    }
    const fees = await Fee.find({ student: student._id }).sort({ dueDate: -1 }).lean();
    res.json({ success: true, data: fees });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/me/results
 * Student only: returns exam marks for the linked student.
 */
router.get('/results', async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Students only.' });
    }
    const student = await getLinkedStudent(req.user.email);
    if (!student) {
      return res.status(404).json({ success: false, message: 'No student record linked.' });
    }
    const results = await ExamMark.find({ student: student._id })
      .populate('exam', 'name examType date')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/me/attendance
 * Student only: returns attendance for the linked student.
 */
router.get('/attendance', async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Students only.' });
    }
    const student = await getLinkedStudent(req.user.email);
    if (!student) {
      return res.status(404).json({ success: false, message: 'No student record linked.' });
    }
    const limit = Math.min(parseInt(req.query.limit, 10) || 60, 120);
    const attendance = await Attendance.find({ student: student._id, type: 'student' })
      .sort({ date: -1 })
      .limit(limit)
      .lean();
    res.json({ success: true, data: attendance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/me/dashboard
 * Student only: summary for student portal dashboard (fees status, attendance summary, recent results).
 */
router.get('/dashboard', async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Students only.' });
    }
    const student = await getLinkedStudent(req.user.email);
    if (!student) {
      return res.status(404).json({ success: false, message: 'No student record linked.' });
    }
    const studentId = student._id;

    const [fees, feeStats, attendanceRecent, resultsRecent, todayUTC] = await Promise.all([
      Fee.find({ student: studentId }).sort({ dueDate: -1 }).limit(10).lean(),
      Fee.aggregate([
        { $match: { student: studentId } },
        { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$amount' }, paid: { $sum: '$paidAmount' } } }
      ]),
      Attendance.find({ student: studentId, type: 'student' }).sort({ date: -1 }).limit(30).lean(),
      ExamMark.find({ student: studentId }).sort({ createdAt: -1 }).limit(5).populate('exam', 'name').lean(),
      (() => {
        const t = new Date();
        t.setUTCHours(0, 0, 0, 0);
        return t;
      })()
    ]);

    const tomorrowUTC = new Date(todayUTC);
    tomorrowUTC.setUTCDate(tomorrowUTC.getUTCDate() + 1);
    const todayAttendance = await Attendance.find({
      student: studentId,
      type: 'student',
      date: { $gte: todayUTC, $lt: tomorrowUTC }
    }).lean();
    const todayPresent = todayAttendance.filter(r => (r.status || '').toLowerCase() === 'present').length;
    const todayAbsent = todayAttendance.filter(r => (r.status || '').toLowerCase() === 'absent').length;

    let pendingFees = 0;
    let paidFees = 0;
    (feeStats || []).forEach(s => {
      if (s._id === 'Pending' || s._id === 'Overdue' || s._id === 'Partial') pendingFees += s.count;
      if (s._id === 'Paid') paidFees += s.count;
    });

    const presentCount = attendanceRecent.filter(r => (r.status || '').toLowerCase() === 'present').length;
    const absentCount = attendanceRecent.filter(r => (r.status || '').toLowerCase() === 'absent').length;

    res.json({
      success: true,
      data: {
        profile: { name: student.name, class: student.class, studentId: student.studentId },
        fees: {
          recent: fees,
          pendingCount: pendingFees,
          paidCount: paidFees
        },
        attendance: {
          recent: attendanceRecent.slice(0, 10),
          last30Present: presentCount,
          last30Absent: absentCount,
          todayPresent,
          todayAbsent
        },
        results: resultsRecent
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/me/exams
 * Student only: list exams (e.g. for their class) - simplified: recent exams from exam marks.
 */
router.get('/exams', async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Students only.' });
    }
    const student = await getLinkedStudent(req.user.email);
    if (!student) {
      return res.status(404).json({ success: false, message: 'No student record linked.' });
    }
    const marks = await ExamMark.find({ student: student._id })
      .populate('exam', 'name examType date class')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    const exams = (marks || []).map(m => ({ ...(m.exam || {}), marksObtained: m.marksObtained, totalMarks: m.totalMarks, subject: m.subject }));
    res.json({ success: true, data: exams });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
