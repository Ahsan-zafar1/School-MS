const mongoose = require('mongoose');
const Class = require('../models/Class');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Exam = require('../models/Exam');
const ExamMark = require('../models/ExamMark');
const Announcement = require('../models/Announcement');
const { getLinkedTeacher, getLinkedStudent } = require('../helpers/meHelpers');

function buildTeacherClassQuery(teacherId, teacher) {
  const query = {
    $or: [
      { classTeacher: teacherId },
      { 'subjects.teacher': teacherId }
    ]
  };
  if (Array.isArray(teacher.classes) && teacher.classes.length) {
    query.$or.push({ _id: { $in: teacher.classes } });
  }
  return query;
}

/**
 * GET /api/me/dashboard (teacher branch)
 * Resolves teacher via getLinkedTeacher(req.user) (ObjectId ref then email fallback).
 * Student count includes students from Class.students and from Student.class matching class name.
 */
async function getTeacherDashboard(req, res) {
  try {
    const teacher = await getLinkedTeacher(req.user);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'No teacher record linked.' });
    }
    const teacherId = teacher._id;
    const classQuery = buildTeacherClassQuery(teacherId, teacher);
    const classIds = await Class.distinct('_id', classQuery);
    const fromClassRef = await Class.distinct('students', { _id: { $in: classIds } });
    const classNames = await Class.distinct('name', { _id: { $in: classIds } });
    const fromClassName = classNames.length
      ? await Student.distinct('_id', { class: { $in: classNames }, isActive: true })
      : [];
    const uniqueIds = new Set([
      ...(fromClassRef || []).filter(Boolean).map((id) => id.toString()),
      ...(fromClassName || []).filter(Boolean).map((id) => id.toString())
    ]);
    const classesCount = classIds.length;
    const studentsCount = uniqueIds.size;

    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);
    const tomorrowUTC = new Date(todayUTC);
    tomorrowUTC.setUTCDate(tomorrowUTC.getUTCDate() + 1);
    const todayAttendance = await Attendance.find({
      type: 'teacher',
      teacher: teacherId,
      date: { $gte: todayUTC, $lt: tomorrowUTC }
    }).lean();
    const todayPresent = todayAttendance.filter(r => (r.status || '').toLowerCase() === 'present').length;
    const todayAbsent = todayAttendance.filter(r => (r.status || '').toLowerCase() === 'absent').length;

    res.json({
      success: true,
      data: {
        profile: { name: teacher.name, teacherId: teacher.teacherId, email: teacher.email },
        classesCount,
        studentsCount,
        todayPresent,
        todayAbsent
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/me/classes (teacher only)
 * Resolves teacher via getLinkedTeacher(req.user).
 * Students come from Class.students; fallback to Student.find({ class: class.name }) so
 * students enrolled by class name (e.g. 2A) are shown even if Class.students was not updated.
 */
async function getTeacherClasses(req, res) {
  try {
    const teacher = await getLinkedTeacher(req.user);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'No teacher record linked.' });
    }
    const teacherId = teacher._id;
    const query = buildTeacherClassQuery(teacherId, teacher);
    const classes = await Class.find(query)
      .populate('classTeacher', 'name teacherId')
      .populate('students', 'name email class studentId')
      .sort({ name: 1 })
      .lean();
    // Fallback: include students where Student.class matches this class name (in case Class.students is not synced)
    for (const cls of classes) {
      const fromRef = cls.students || [];
      const byName = await Student.find({ class: cls.name, isActive: true })
        .select('name email class studentId')
        .lean();
      const seen = new Set(fromRef.map((s) => (s && s._id ? s._id.toString() : '')));
      for (const s of byName) {
        if (s && s._id && !seen.has(s._id.toString())) {
          seen.add(s._id.toString());
          fromRef.push(s);
        }
      }
      cls.students = fromRef;
    }
    res.json({ success: true, data: classes, count: classes.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/me/students (teacher only)
 * Resolves teacher via getLinkedTeacher(req.user).
 * Includes students from Class.students and students where Student.class matches teacher's class names.
 */
async function getTeacherStudents(req, res) {
  try {
    const teacher = await getLinkedTeacher(req.user);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'No teacher record linked.' });
    }
    const teacherId = teacher._id;
    const classQuery = buildTeacherClassQuery(teacherId, teacher);
    const classIds = await Class.distinct('_id', classQuery);
    const fromClassRef = await Class.distinct('students', { _id: { $in: classIds } });
    const classNames = await Class.distinct('name', { _id: { $in: classIds } });
    const fromClassName = classNames.length
      ? await Student.distinct('_id', { class: { $in: classNames }, isActive: true })
      : [];
    const uniqueIds = [...new Set([
      ...(fromClassRef || []).filter(Boolean).map((id) => id.toString()),
      ...(fromClassName || []).filter(Boolean).map((id) => id.toString())
    ])];
    if (uniqueIds.length === 0) {
      return res.json({ success: true, data: [], count: 0 });
    }
    const students = await Student.find({ _id: { $in: uniqueIds }, isActive: true })
      .select('name email class studentId rollNumber')
      .sort({ class: 1, name: 1 })
      .lean();
    res.json({ success: true, data: students, count: students.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/me/schedule (teacher only) – weekly timetable from Class.schedule.
 */
async function getTeacherSchedule(req, res) {
  try {
    const teacher = await getLinkedTeacher(req.user);
    if (!teacher) return res.status(404).json({ success: false, message: 'No teacher record linked.' });
    const teacherId = teacher._id;
    const query = buildTeacherClassQuery(teacherId, teacher);
    const classes = await Class.find(query).select('name section schedule').lean();
    const schedule = (classes || []).map((c) => ({
      classId: c._id,
      className: c.name,
      section: c.section,
      schedule: c.schedule || []
    }));
    res.json({ success: true, data: schedule });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/me/attendance/class (teacher only) – students + existing attendance for a class on a date.
 * Query: classId or className, date (YYYY-MM-DD).
 */
async function getTeacherAttendanceForClass(req, res) {
  try {
    const teacher = await getLinkedTeacher(req.user);
    if (!teacher) return res.status(404).json({ success: false, message: 'No teacher record linked.' });
    const classId = req.query.classId;
    const className = req.query.className;
    const dateStr = req.query.date;
    if (!dateStr) return res.status(400).json({ success: false, message: 'date is required.' });
    const classQuery = buildTeacherClassQuery(teacher._id, teacher);
    let cls = null;
    if (classId && mongoose.Types.ObjectId.isValid(classId)) {
      cls = await Class.findOne({ _id: classId, $or: classQuery.$or }).lean();
    }
    if (!cls && className) cls = await Class.findOne({ ...classQuery, name: className }).lean();
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found or not assigned to you.' });
    const classNames = [cls.name];
    const studentIdsFromRef = (cls.students || []).map((id) => (id != null && typeof id === 'object' && id.toString ? id.toString() : String(id)));
    const studentsByName = await Student.find({ class: cls.name, isActive: true }).select('_id name rollNumber studentId').lean();
    const allIds = [...new Set([...studentIdsFromRef, ...studentsByName.map((s) => s._id.toString())])];
    const students = allIds.length ? await Student.find({ _id: { $in: allIds }, isActive: true }).select('_id name rollNumber studentId').sort({ rollNumber: 1, name: 1 }).lean() : [];
    const dayStart = new Date(dateStr);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
    const existing = await Attendance.find({
      type: 'student',
      class: cls.name,
      date: { $gte: dayStart, $lt: dayEnd },
      student: { $in: students.map((s) => s._id) }
    }).lean();
    const byStudent = {};
    existing.forEach((r) => { byStudent[r.student.toString()] = r; });
    const list = students.map((s) => ({
      studentId: s._id,
      name: s.name,
      rollNumber: s.rollNumber,
      studentIdCode: s.studentId,
      status: byStudent[s._id.toString()]?.status || 'unmarked'
    }));
    res.json({ success: true, data: { class: cls.name, classId: cls._id, date: dayStart, students: list } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/** Ensure teacher teaches the class (by id or name). Returns { classDoc, className } or null. */
async function assertTeacherClass(teacher, classId, className) {
  const classQuery = buildTeacherClassQuery(teacher._id, teacher);
  let cls = null;
  if (classId && mongoose.Types.ObjectId.isValid(classId)) cls = await Class.findOne({ _id: classId, $or: classQuery.$or }).lean();
  if (!cls && className) cls = await Class.findOne({ ...classQuery, name: className }).lean();
  if (!cls && classId) cls = await Class.findById(classId).lean();
  if (!cls) return null;
  const allowed = await Class.findOne({ _id: cls._id, $or: classQuery.$or }).lean();
  return allowed ? { classDoc: cls, className: cls.name } : null;
}

/**
 * POST /api/me/attendance/mark (teacher only) – same shape as admin POST /attendance/mark; uses same Attendance collection.
 */
async function markTeacherAttendance(req, res) {
  try {
    const teacher = await getLinkedTeacher(req.user);
    if (!teacher) return res.status(404).json({ success: false, message: 'No teacher record linked.' });
    const { date, class: className, classId, attendanceData, academicYear } = req.body;
    const cn = className || (classId ? (await Class.findById(classId).select('name').lean())?.name : null);
    if (!date || !cn || !attendanceData || !Array.isArray(attendanceData)) {
      return res.status(400).json({ success: false, message: 'Date, class (or classId), and attendanceData array are required.' });
    }
    const allowed = await assertTeacherClass(teacher, classId, cn);
    if (!allowed) return res.status(403).json({ success: false, message: 'Class not found or you do not teach this class.' });
    const attendanceDate = new Date(date);
    attendanceDate.setUTCHours(0, 0, 0, 0);
    const nextDay = new Date(attendanceDate);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    const studentIds = attendanceData.map((r) => r.studentId).filter(Boolean);
    const studentObjectIds = studentIds.map((id) => (mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null)).filter(Boolean);
    const students = await Student.find({ _id: { $in: studentObjectIds }, class: allowed.className, isActive: true }).lean();
    if (students.length !== studentObjectIds.length) {
      return res.status(400).json({ success: false, message: 'Some students not found or not in this class.' });
    }
    await Attendance.deleteMany({
      date: { $gte: attendanceDate, $lt: nextDay },
      class: allowed.className,
      type: 'student',
      student: { $in: studentObjectIds }
    });
    const records = [];
    for (const record of attendanceData) {
      if (record.status && record.status !== 'unmarked') {
        const sid = record.studentId;
        const oid = mongoose.Types.ObjectId.isValid(sid) ? new mongoose.Types.ObjectId(sid) : null;
        if (!oid) continue;
        records.push({
          date: attendanceDate,
          student: oid,
          class: allowed.className,
          type: 'student',
          academicYear: academicYear || new Date().getFullYear().toString(),
          status: record.status,
          recordedBy: 'manual',
          isActive: true,
          createdBy: req.user._id
        });
      }
    }
    if (records.length > 0) await Attendance.insertMany(records, { ordered: false });
    const updated = await Attendance.find({
      date: { $gte: attendanceDate, $lt: nextDay },
      class: allowed.className,
      type: 'student'
    }).populate('student', 'name rollNumber studentId class').sort({ 'student.rollNumber': 1 }).lean();
    res.json({ success: true, message: `Attendance marked for ${records.length} students`, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/me/attendance/records (teacher only) – list attendance for teacher's classes; same data as admin view.
 */
async function getTeacherAttendanceRecords(req, res) {
  try {
    const teacher = await getLinkedTeacher(req.user);
    if (!teacher) return res.status(404).json({ success: false, message: 'No teacher record linked.' });
    const classQuery = buildTeacherClassQuery(teacher._id, teacher);
    const classNames = await Class.distinct('name', classQuery);
    const filter = { type: 'student', class: { $in: classNames } };
    if (req.query.className) filter.class = req.query.className;
    if (req.query.dateFrom || req.query.dateTo) {
      filter.date = {};
      if (req.query.dateFrom) { const d = new Date(req.query.dateFrom); d.setUTCHours(0, 0, 0, 0); filter.date.$gte = d; }
      if (req.query.dateTo) { const d = new Date(req.query.dateTo); d.setUTCHours(23, 59, 59, 999); filter.date.$lte = d; }
    }
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;
    const [records, total] = await Promise.all([
      Attendance.find(filter).populate('student', 'name rollNumber studentId class').sort({ date: -1 }).skip(skip).limit(limit).lean(),
      Attendance.countDocuments(filter)
    ]);
    res.json({ success: true, data: records, total, page, limit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/me/exams (teacher only) – exams for teacher's classes.
 */
async function getTeacherExams(req, res) {
  try {
    const teacher = await getLinkedTeacher(req.user);
    if (!teacher) return res.status(404).json({ success: false, message: 'No teacher record linked.' });
    const classQuery = buildTeacherClassQuery(teacher._id, teacher);
    const classNames = await Class.distinct('name', classQuery);
    const exams = await Exam.find({ class: { $in: classNames }, isActive: true }).sort({ date: -1 }).lean();
    res.json({ success: true, data: exams, count: exams.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/me/exam-marks (teacher only) – marks for an exam or for a class/term/year.
 */
async function getTeacherExamMarks(req, res) {
  try {
    const teacher = await getLinkedTeacher(req.user);
    if (!teacher) return res.status(404).json({ success: false, message: 'No teacher record linked.' });
    const classQuery = buildTeacherClassQuery(teacher._id, teacher);
    const classNames = await Class.distinct('name', classQuery);
    const filter = { class: { $in: classNames }, isActive: true };
    if (req.query.examId) filter.exam = req.query.examId;
    if (req.query.class) filter.class = req.query.class;
    if (req.query.term) filter.term = req.query.term;
    if (req.query.academicYear) filter.academicYear = req.query.academicYear;
    const marks = await ExamMark.find(filter)
      .populate('student', 'name rollNumber studentId class')
      .populate('exam', 'examName examType subject date totalMarks')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    res.json({ success: true, data: marks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/me/exam-marks (teacher only) – create mark; student must be in teacher's class.
 */
async function createTeacherExamMark(req, res) {
  try {
    const teacher = await getLinkedTeacher(req.user);
    if (!teacher) return res.status(404).json({ success: false, message: 'No teacher record linked.' });
    const classNames = await Class.distinct('name', buildTeacherClassQuery(teacher._id, teacher));
    const { student, exam, subject, class: className, term, academicYear, marksObtained, totalMarks, passingPercentage, remarks } = req.body;
    if (!student || !subject || !className || !term || !academicYear) {
      return res.status(400).json({ success: false, message: 'Missing required fields: student, subject, class, term, academicYear.' });
    }
    if (!classNames.includes(className)) return res.status(403).json({ success: false, message: 'You do not teach this class.' });
    const stu = await Student.findOne({ _id: student, class: className, isActive: true }).lean();
    if (!stu) return res.status(400).json({ success: false, message: 'Student not found or not in this class.' });
    const total = Number(totalMarks) || 100;
    const obtained = Number(marksObtained) ?? 0;
    if (obtained < 0 || total <= 0 || obtained > total) {
      return res.status(400).json({ success: false, message: 'Invalid marks.' });
    }
    const existing = await ExamMark.findOne({ student, subject, term, academicYear }).lean();
    if (existing) return res.status(400).json({ success: false, message: 'A mark already exists for this student, subject, term, and year.' });
    const doc = await ExamMark.create({
      student,
      exam: exam || undefined,
      subject,
      class: className,
      term,
      academicYear,
      marksObtained: obtained,
      totalMarks: total,
      passingPercentage: passingPercentage != null ? Number(passingPercentage) : 50,
      percentage: total ? Math.round((obtained / total) * 10000) / 100 : 0,
      status: obtained >= (total * (passingPercentage != null ? Number(passingPercentage) : 50) / 100) ? 'Pass' : 'Fail',
      remarks: remarks || '',
      isActive: true,
      createdBy: req.user._id
    });
    const populated = await ExamMark.findById(doc._id).populate('student', 'name rollNumber studentId class').populate('exam', 'examName examType subject').lean();
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * PUT /api/me/exam-marks/:id (teacher only) – update mark if it belongs to teacher's class.
 */
async function updateTeacherExamMark(req, res) {
  try {
    const teacher = await getLinkedTeacher(req.user);
    if (!teacher) return res.status(404).json({ success: false, message: 'No teacher record linked.' });
    const classNames = await Class.distinct('name', buildTeacherClassQuery(teacher._id, teacher));
    const existing = await ExamMark.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ success: false, message: 'Exam mark not found.' });
    if (!classNames.includes(existing.class)) return res.status(403).json({ success: false, message: 'You do not teach this class.' });
    const { marksObtained, totalMarks, remarks } = req.body;
    const update = {};
    if (marksObtained !== undefined) update.marksObtained = Number(marksObtained);
    if (totalMarks !== undefined) update.totalMarks = Number(totalMarks);
    if (remarks !== undefined) update.remarks = remarks;
    if (update.marksObtained !== undefined && (update.marksObtained < 0 || (update.totalMarks ?? existing.totalMarks) <= 0 || update.marksObtained > (update.totalMarks ?? existing.totalMarks))) {
      return res.status(400).json({ success: false, message: 'Invalid marks.' });
    }
    const total = update.totalMarks ?? existing.totalMarks;
    const obtained = update.marksObtained ?? existing.marksObtained;
    update.percentage = total ? Math.round((obtained / total) * 10000) / 100 : 0;
    update.status = obtained >= (total * (existing.passingPercentage || 50) / 100) ? 'Pass' : 'Fail';
    const updated = await ExamMark.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('student', 'name rollNumber studentId class').populate('exam', 'examName examType subject').lean();
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/me/attendance/export (teacher only) – CSV export; same filters as records.
 */
async function exportTeacherAttendance(req, res) {
  try {
    const teacher = await getLinkedTeacher(req.user);
    if (!teacher) return res.status(404).json({ success: false, message: 'No teacher record linked.' });
    const classQuery = buildTeacherClassQuery(teacher._id, teacher);
    const classNames = await Class.distinct('name', classQuery);
    const filter = { type: 'student', class: { $in: classNames } };
    if (req.query.className) filter.class = req.query.className;
    if (req.query.dateFrom || req.query.dateTo) {
      filter.date = {};
      if (req.query.dateFrom) { const d = new Date(req.query.dateFrom); d.setUTCHours(0, 0, 0, 0); filter.date.$gte = d; }
      if (req.query.dateTo) { const d = new Date(req.query.dateTo); d.setUTCHours(23, 59, 59, 999); filter.date.$lte = d; }
    }
    const records = await Attendance.find(filter)
      .populate('student', 'name rollNumber studentId class')
      .sort({ date: -1, class: 1 })
      .limit(5000)
      .lean();
    const escape = (v) => (v == null ? '' : String(v).replace(/"/g, '""'));
    const row = (r) => [
      r.date ? new Date(r.date).toLocaleDateString() : '',
      r.student?.name ?? '',
      r.student?.rollNumber ?? '',
      r.student?.studentId ?? '',
      r.class ?? '',
      r.status ?? ''
    ].map(escape).join(',');
    const header = 'Date,Student Name,Roll Number,Student ID,Class,Status\n';
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=my-attendance.csv');
    res.send(header + records.map(row).join('\n'));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/me/analytics (teacher only) – per-class attendance % and average marks.
 */
async function getTeacherAnalytics(req, res) {
  try {
    const teacher = await getLinkedTeacher(req.user);
    if (!teacher) return res.status(404).json({ success: false, message: 'No teacher record linked.' });
    const classQuery = buildTeacherClassQuery(teacher._id, teacher);
    const classes = await Class.find(classQuery).select('name _id').lean();
    const classNames = classes.map((c) => c.name);
    const analytics = [];
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    for (const cls of classes) {
      const studentIds = await Student.distinct('_id', { class: cls.name, isActive: true });
      const fromClass = await Class.distinct('students', { _id: cls._id });
      const allIds = [...new Set([...studentIds.map((id) => id.toString()), ...(fromClass || []).map((id) => id.toString())])];
      const totalStudents = allIds.length;
      const attendanceCount = await Attendance.countDocuments({
        type: 'student',
        class: cls.name,
        status: 'present',
        date: { $gte: yearStart }
      });
      const totalPossible = totalStudents * Math.max(1, Math.ceil((now - yearStart) / (24 * 60 * 60 * 1000)));
      const attendancePct = totalPossible > 0 ? Math.round((attendanceCount / totalPossible) * 10000) / 100 : 0;
      const marksAgg = await ExamMark.aggregate([
        { $match: { class: cls.name, isActive: true } },
        { $group: { _id: null, avg: { $avg: '$percentage' }, count: { $sum: 1 } } }
      ]);
      const avgMarks = marksAgg[0] ? Math.round(marksAgg[0].avg * 100) / 100 : null;
      analytics.push({
        classId: cls._id,
        className: cls.name,
        totalStudents,
        attendancePercent: attendancePct,
        averageMarksPercent: avgMarks,
        marksCount: marksAgg[0]?.count || 0
      });
    }
    res.json({ success: true, data: analytics });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/me/announcements – teacher: for my classes; student: for my class. Same data admin sees in full list.
 */
async function getMyAnnouncements(req, res) {
  try {
    const role = req.user.role;
    let classNames = [];
    if (role === 'teacher') {
      const teacher = await getLinkedTeacher(req.user);
      if (!teacher) return res.status(404).json({ success: false, message: 'No teacher record linked.' });
      classNames = await Class.distinct('name', buildTeacherClassQuery(teacher._id, teacher));
    } else if (role === 'student') {
      const student = await getLinkedStudent(req.user);
      if (!student) return res.status(404).json({ success: false, message: 'No student record linked.' });
      classNames = [student.class].filter(Boolean);
    } else {
      return res.status(403).json({ success: false, message: 'Teachers and students only.' });
    }
    const filter = { isActive: true };
    if (classNames.length > 0) {
      filter.$or = [
        { targetType: 'all' },
        { targetType: 'class', targetClasses: { $in: classNames } }
      ];
    } else {
      filter.$or = [{ targetType: 'all' }];
    }
    const list = await Announcement.find(filter)
      .populate('createdBy', 'name _id')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/me/announcements (teacher only) – targetClasses must be subset of teacher's classes.
 */
async function createAnnouncement(req, res) {
  try {
    const teacher = await getLinkedTeacher(req.user);
    if (!teacher) return res.status(404).json({ success: false, message: 'No teacher record linked.' });
    const myClassNames = await Class.distinct('name', buildTeacherClassQuery(teacher._id, teacher));
    const { title, message, targetClasses } = req.body;
    if (!title || !message) return res.status(400).json({ success: false, message: 'title and message required.' });
    const targets = Array.isArray(targetClasses) ? targetClasses : (targetClasses ? [targetClasses] : []);
    const invalid = targets.filter((c) => !myClassNames.includes(c));
    if (targets.length > 0 && invalid.length > 0) {
      return res.status(403).json({ success: false, message: 'You can only target classes you teach.' });
    }
    const doc = await Announcement.create({
      title: title.trim(),
      message: message.trim(),
      createdBy: req.user._id,
      targetType: targets.length === 0 ? 'all' : 'class',
      targetClasses: targets,
      isActive: true
    });
    const populated = await Announcement.findById(doc._id).populate('createdBy', 'name _id').lean();
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * PUT /api/me/announcements/:id (teacher only) – update own announcement.
 */
async function updateAnnouncement(req, res) {
  try {
    const teacher = await getLinkedTeacher(req.user);
    if (!teacher) return res.status(404).json({ success: false, message: 'No teacher record linked.' });
    const doc = await Announcement.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Announcement not found.' });
    if (doc.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only edit your own announcements.' });
    }
    const myClassNames = await Class.distinct('name', buildTeacherClassQuery(teacher._id, teacher));
    const { title, message, targetClasses } = req.body;
    const update = {};
    if (title !== undefined) update.title = title.trim();
    if (message !== undefined) update.message = message.trim();
    if (targetClasses !== undefined) {
      const targets = Array.isArray(targetClasses) ? targetClasses : [];
      const invalid = targets.filter((c) => !myClassNames.includes(c));
      if (invalid.length > 0) return res.status(403).json({ success: false, message: 'You can only target classes you teach.' });
      update.targetClasses = targets;
      update.targetType = targets.length === 0 ? 'all' : 'class';
    }
    const updated = await Announcement.findByIdAndUpdate(req.params.id, update, { new: true }).populate('createdBy', 'name _id').lean();
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * DELETE /api/me/announcements/:id (teacher only) – delete own announcement (soft).
 */
async function deleteAnnouncement(req, res) {
  try {
    const doc = await Announcement.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Announcement not found.' });
    if (doc.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only delete your own announcements.' });
    }
    await Announcement.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Announcement deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
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
};
