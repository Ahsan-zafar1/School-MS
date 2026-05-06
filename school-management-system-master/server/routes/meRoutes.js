const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getLinkedStudent, getLinkedTeacher } = require('../helpers/meHelpers');
const {
  getTeacherDashboard,
  getTeacherClasses,
  getTeacherStudents,
  getTeacherSchedule,
  getTeacherAttendanceForClass,
  markTeacherAttendance,
  getTeacherAttendanceRecords,
  exportTeacherAttendance,
  getTeacherExams,
  getTeacherExamMarks,
  createTeacherExamMark,
  updateTeacherExamMark,
  getTeacherAnalytics,
  getMyAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
} = require('../controllers/meController');
const Fee = require('../models/Fee');
const ExamMark = require('../models/ExamMark');
const Attendance = require('../models/Attendance');
const Exam = require('../models/Exam');

// All /api/me routes require authentication
router.use(protect);

/**
 * GET /api/me/profile
 * Returns the current user's linked Student or Teacher record.
 * Uses user.student / user.teacher ObjectId if set; otherwise fallback to email lookup.
 * Admin gets 403 for this endpoint (use admin panels instead).
 */
router.get('/profile', async (req, res) => {
  try {
    const { role, email } = req.user;
    if (role === 'admin') {
      return res.status(403).json({ success: false, message: 'Admins use the main dashboard.' });
    }
    if (role === 'student') {
      const student = await getLinkedStudent(req.user);
      if (!student) {
        return res.status(404).json({ success: false, message: 'No student record linked to this account.' });
      }
      return res.json({ success: true, data: student });
    }
    if (role === 'teacher') {
      const teacher = await getLinkedTeacher(req.user);
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
    const student = await getLinkedStudent(req.user);
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
    const student = await getLinkedStudent(req.user);
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
    const student = await getLinkedStudent(req.user);
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
 * Student: summary (fees, attendance, results). Teacher: summary (profile, classes count, students count).
 */
router.get('/dashboard', async (req, res) => {
  try {
    if (req.user.role === 'teacher') {
      return getTeacherDashboard(req, res);
    }
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Students only.' });
    }
    const student = await getLinkedStudent(req.user);
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
 * Student: exams from their marks. Teacher: exams for their classes.
 */
router.get('/exams', async (req, res) => {
  try {
    if (req.user.role === 'teacher') {
      return getTeacherExams(req, res);
    }
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Students only.' });
    }
    const student = await getLinkedStudent(req.user);
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

/**
 * GET /api/me/classes
 * Teacher only: classes where teacher is classTeacher or in subjects.teacher or in teacher.classes.
 */
router.get('/classes', async (req, res) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Teachers only.' });
  }
  return getTeacherClasses(req, res);
});

/**
 * GET /api/me/students
 * Teacher only: students in classes taught by this teacher.
 */
router.get('/students', async (req, res) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Teachers only.' });
  }
  return getTeacherStudents(req, res);
});

// ---------- Teacher: schedule, attendance, exam-marks, analytics ----------
router.get('/schedule', (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ success: false, message: 'Teachers only.' });
  return getTeacherSchedule(req, res);
});

router.get('/attendance/class', (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ success: false, message: 'Teachers only.' });
  return getTeacherAttendanceForClass(req, res);
});
router.get('/attendance/export', (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ success: false, message: 'Teachers only.' });
  return exportTeacherAttendance(req, res);
});
router.get('/attendance/records', (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ success: false, message: 'Teachers only.' });
  return getTeacherAttendanceRecords(req, res);
});
router.post('/attendance/mark', (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ success: false, message: 'Teachers only.' });
  return markTeacherAttendance(req, res);
});

router.get('/exam-marks', (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ success: false, message: 'Teachers only.' });
  return getTeacherExamMarks(req, res);
});
router.post('/exam-marks', (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ success: false, message: 'Teachers only.' });
  return createTeacherExamMark(req, res);
});
router.put('/exam-marks/:id', (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ success: false, message: 'Teachers only.' });
  return updateTeacherExamMark(req, res);
});

router.get('/analytics', (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ success: false, message: 'Teachers only.' });
  return getTeacherAnalytics(req, res);
});

router.get('/announcements', getMyAnnouncements);
router.post('/announcements', (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ success: false, message: 'Teachers only.' });
  return createAnnouncement(req, res);
});
router.put('/announcements/:id', (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ success: false, message: 'Teachers only.' });
  return updateAnnouncement(req, res);
});
router.delete('/announcements/:id', (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ success: false, message: 'Teachers only.' });
  return deleteAnnouncement(req, res);
});

module.exports = router;
