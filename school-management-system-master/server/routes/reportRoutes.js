const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const Exam = require('../models/Exam');
const ExamMark = require('../models/ExamMark');
const Fee = require('../models/Fee');
const Attendance = require('../models/Attendance');
const { protect } = require('../middleware/auth');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Protect all routes
router.use(protect);

// ========== STUDENT REPORTS ==========

// Student Performance Report
router.get('/student/performance', async (req, res) => {
  try {
    const { studentId, class: className, dateFrom, dateTo, academicYear } = req.query;
    
    let filter = {};
    if (studentId) {
      const student = await Student.findOne({ studentId });
      if (!student) {
        return res.status(404).json({ success: false, message: 'Student not found' });
      }
      filter.student = student._id;
    }
    if (className) {
      const students = await Student.find({ class: className, isActive: true });
      filter.student = { $in: students.map(s => s._id) };
    }
    if (academicYear) filter.academicYear = academicYear;
    
    if (dateFrom || dateTo) {
      filter.exam = {};
      const exams = await Exam.find({
        ...(dateFrom ? { date: { $gte: new Date(dateFrom) } } : {}),
        ...(dateTo ? { date: { $lte: new Date(dateTo) } } : {})
      });
      filter.exam = { $in: exams.map(e => e._id) };
    }
    
    const results = await ExamMark.find(filter)
      .populate('student', 'name rollNumber studentId class')
      .populate('exam', 'examName subject date totalMarks')
      .sort({ 'exam.date': -1 })
      .lean();
    
    // Calculate statistics
    const totalExams = results.length;
    const totalMarks = results.reduce((sum, r) => sum + (r.totalMarks || 0), 0);
    const obtainedMarks = results.reduce((sum, r) => sum + (r.marksObtained || 0), 0);
    const averagePercentage = totalExams > 0 ? (obtainedMarks / totalMarks) * 100 : 0;
    const passed = results.filter(r => r.status === 'Pass').length;
    const failed = results.filter(r => r.status === 'Fail').length;
    
    res.json({
      success: true,
      data: {
        results,
        statistics: {
          totalExams,
          totalMarks,
          obtainedMarks,
          averagePercentage: Math.round(averagePercentage * 100) / 100,
          passed,
          failed,
          passPercentage: totalExams > 0 ? Math.round((passed / totalExams) * 100 * 100) / 100 : 0
        }
      }
    });
  } catch (error) {
    console.error('Student performance report error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Student Attendance Report
router.get('/student/attendance', async (req, res) => {
  try {
    const { studentId, class: className, dateFrom, dateTo, academicYear } = req.query;
    
    let filter = { type: 'student' };
    if (studentId) {
      const student = await Student.findOne({ studentId });
      if (!student) {
        return res.status(404).json({ success: false, message: 'Student not found' });
      }
      filter.student = student._id;
    }
    if (className) {
      const students = await Student.find({ class: className, isActive: true });
      filter.student = { $in: students.map(s => s._id) };
      filter.class = className;
    }
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
      .populate('student', 'name rollNumber studentId class')
      .sort({ date: -1 })
      .lean();
    
    // Calculate statistics
    const totalDays = attendance.length;
    const present = attendance.filter(a => a.status === 'present').length;
    const absent = attendance.filter(a => a.status === 'absent').length;
    const late = attendance.filter(a => a.status === 'late').length;
    const excused = attendance.filter(a => a.status === 'excused').length;
    const attendancePercentage = totalDays > 0 ? (present / totalDays) * 100 : 0;
    
    res.json({
      success: true,
      data: {
        attendance,
        statistics: {
          totalDays,
          present,
          absent,
          late,
          excused,
          attendancePercentage: Math.round(attendancePercentage * 100) / 100
        }
      }
    });
  } catch (error) {
    console.error('Student attendance report error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Student Fee Report
router.get('/student/fee', async (req, res) => {
  try {
    const { studentId, class: className, dateFrom, dateTo, status, academicYear } = req.query;
    
    let filter = {};
    if (studentId) {
      const student = await Student.findOne({ studentId });
      if (!student) {
        return res.status(404).json({ success: false, message: 'Student not found' });
      }
      filter.student = student._id;
    }
    if (className) {
      const students = await Student.find({ class: className, isActive: true });
      filter.student = { $in: students.map(s => s._id) };
    }
    if (status) filter.status = status;
    if (academicYear) filter.academicYear = academicYear;
    
    if (dateFrom || dateTo) {
      filter.dueDate = {};
      if (dateFrom) {
        const dateFromObj = new Date(dateFrom);
        dateFromObj.setUTCHours(0, 0, 0, 0);
        filter.dueDate.$gte = dateFromObj;
      }
      if (dateTo) {
        const dateToObj = new Date(dateTo);
        dateToObj.setUTCHours(23, 59, 59, 999);
        filter.dueDate.$lte = dateToObj;
      }
    }
    
    const fees = await Fee.find(filter)
      .populate('student', 'name rollNumber studentId class')
      .sort({ dueDate: -1 })
      .lean();
    
    // Calculate statistics
    const totalFees = fees.length;
    const totalAmount = fees.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
    const totalPaid = fees.reduce((sum, f) => sum + (Number(f.paidAmount) || 0), 0);
    const totalDiscount = fees.reduce((sum, f) => sum + (Number(f.discount) || 0), 0);
    
    // Calculate pending: Only count fees that are not fully paid
    // For each fee: pending = amount - paidAmount - discount
    // Only sum up fees that have status != 'Paid'
    const totalPending = fees.reduce((sum, f) => {
      if (f.status === 'Paid') return sum;
      const feePending = Math.max(0, (Number(f.amount) || 0) - (Number(f.paidAmount) || 0) - (Number(f.discount) || 0));
      return sum + feePending;
    }, 0);
    
    const paid = fees.filter(f => f.status === 'Paid').length;
    const pending = fees.filter(f => f.status === 'Pending' || f.status === 'Overdue' || f.status === 'Partial').length;
    const overdue = fees.filter(f => f.status === 'Overdue').length;
    
    res.json({
      success: true,
      data: {
        fees,
        statistics: {
          totalFees,
          totalAmount,
          totalPaid,
          totalPending,
          totalDiscount,
          paid,
          pending,
          overdue,
          collectionPercentage: totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100 * 100) / 100 : 0
        }
      }
    });
  } catch (error) {
    console.error('Student fee report error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== TEACHER REPORTS ==========

// Teacher Attendance Report
router.get('/teacher/attendance', async (req, res) => {
  try {
    const { teacherId, dateFrom, dateTo, academicYear } = req.query;
    
    let filter = { type: 'teacher' };
    if (teacherId) {
      const teacher = await Teacher.findOne({ teacherId });
      if (!teacher) {
        return res.status(404).json({ success: false, message: 'Teacher not found' });
      }
      filter.teacher = teacher._id;
    }
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
      .populate('teacher', 'name teacherId email phone department')
      .sort({ date: -1 })
      .lean();
    
    // Calculate statistics
    const totalDays = attendance.length;
    const present = attendance.filter(a => a.status === 'present').length;
    const absent = attendance.filter(a => a.status === 'absent').length;
    const late = attendance.filter(a => a.status === 'late').length;
    const attendancePercentage = totalDays > 0 ? (present / totalDays) * 100 : 0;
    
    res.json({
      success: true,
      data: {
        attendance,
        statistics: {
          totalDays,
          present,
          absent,
          late,
          attendancePercentage: Math.round(attendancePercentage * 100) / 100
        }
      }
    });
  } catch (error) {
    console.error('Teacher attendance report error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== CLASS REPORTS ==========

// Class Performance Report
router.get('/class/performance', async (req, res) => {
  try {
    const { class: className, academicYear, dateFrom, dateTo } = req.query;
    
    if (!className) {
      return res.json({
        success: true,
        data: {
          className: '',
          students: [],
          statistics: {
            totalStudents: 0,
            totalExams: 0,
            totalResults: 0,
            passed: 0,
            failed: 0,
            averagePercentage: 0,
            passPercentage: 0
          }
        }
      });
    }
    
    const students = await Student.find({ class: className, isActive: true });
    const studentIds = students.map(s => s._id);
    
    let examFilter = { class: className };
    if (academicYear) examFilter.academicYear = academicYear;
    if (dateFrom || dateTo) {
      examFilter.date = {};
      if (dateFrom) examFilter.date.$gte = new Date(dateFrom);
      if (dateTo) examFilter.date.$lte = new Date(dateTo);
    }
    
    const exams = await Exam.find(examFilter);
    const examIds = exams.map(e => e._id);
    
    const results = await ExamMark.find({
      student: { $in: studentIds },
      exam: { $in: examIds }
    })
      .populate('student', 'name rollNumber studentId')
      .populate('exam', 'examName subject date totalMarks')
      .lean();
    
    // Calculate class statistics
    const totalStudents = students.length;
    const totalExams = exams.length;
    const totalResults = results.length;
    const passed = results.filter(r => r.status === 'Pass').length;
    const failed = results.filter(r => r.status === 'Fail').length;
    const averagePercentage = totalResults > 0 
      ? results.reduce((sum, r) => sum + (r.percentage || 0), 0) / totalResults 
      : 0;
    
    // Student-wise performance
    const studentPerformance = students.map(student => {
      const studentResults = results.filter(r => r.student._id.toString() === student._id.toString());
      const studentTotalMarks = studentResults.reduce((sum, r) => sum + (r.totalMarks || 0), 0);
      const studentObtainedMarks = studentResults.reduce((sum, r) => sum + (r.marksObtained || 0), 0);
      const studentPercentage = studentTotalMarks > 0 ? (studentObtainedMarks / studentTotalMarks) * 100 : 0;
      const studentPassed = studentResults.filter(r => r.status === 'Pass').length;
      
      return {
        student: {
          name: student.name,
          rollNumber: student.rollNumber,
          studentId: student.studentId
        },
        totalExams: studentResults.length,
        passed: studentPassed,
        failed: studentResults.length - studentPassed,
        averagePercentage: Math.round(studentPercentage * 100) / 100
      };
    });
    
    res.json({
      success: true,
      data: {
        className,
        students: studentPerformance,
        statistics: {
          totalStudents,
          totalExams,
          totalResults,
          passed,
          failed,
          averagePercentage: Math.round(averagePercentage * 100) / 100,
          passPercentage: totalResults > 0 ? Math.round((passed / totalResults) * 100 * 100) / 100 : 0
        }
      }
    });
  } catch (error) {
    console.error('Class performance report error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Class Attendance Report
router.get('/class/attendance', async (req, res) => {
  try {
    const { class: className, dateFrom, dateTo, academicYear } = req.query;
    
    if (!className) {
      return res.status(400).json({ success: false, message: 'Class is required' });
    }
    
    let filter = { type: 'student', class: className };
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
    
    const students = await Student.find({ class: className, isActive: true });
    const attendance = await Attendance.find(filter)
      .populate('student', 'name rollNumber studentId')
      .sort({ date: -1 })
      .lean();
    
    // Calculate statistics
    const uniqueDates = [...new Set(attendance.map(a => a.date.toISOString().split('T')[0]))];
    const totalDays = uniqueDates.length;
    const present = attendance.filter(a => a.status === 'present').length;
    const absent = attendance.filter(a => a.status === 'absent').length;
    const late = attendance.filter(a => a.status === 'late').length;
    
    // Student-wise attendance
    const studentAttendance = students.map(student => {
      const studentRecords = attendance.filter(a => a.student._id.toString() === student._id.toString());
      const studentPresent = studentRecords.filter(a => a.status === 'present').length;
      const studentAbsent = studentRecords.filter(a => a.status === 'absent').length;
      const studentPercentage = totalDays > 0 ? (studentPresent / totalDays) * 100 : 0;
      
      return {
        student: {
          name: student.name,
          rollNumber: student.rollNumber,
          studentId: student.studentId
        },
        present: studentPresent,
        absent: studentAbsent,
        late: studentRecords.filter(a => a.status === 'late').length,
        attendancePercentage: Math.round(studentPercentage * 100) / 100
      };
    });
    
    res.json({
      success: true,
      data: {
        className,
        students: studentAttendance,
        statistics: {
          totalStudents: students.length,
          totalDays,
          present,
          absent,
          late,
          averageAttendancePercentage: totalDays > 0 && students.length > 0
            ? Math.round((present / (totalDays * students.length)) * 100 * 100) / 100
            : 0
        }
      }
    });
  } catch (error) {
    console.error('Class attendance report error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== EXAM REPORTS ==========

// Exam Results Report
router.get('/exam/results', async (req, res) => {
  try {
    const { examId, class: className, academicYear } = req.query;
    
    let filter = {};
    if (examId) {
      const exam = await Exam.findOne({ examId });
      if (!exam) {
        return res.status(404).json({ success: false, message: 'Exam not found' });
      }
      filter.exam = exam._id;
    }
    if (className) {
      const students = await Student.find({ class: className, isActive: true });
      filter.student = { $in: students.map(s => s._id) };
    }
    if (academicYear) filter.academicYear = academicYear;
    
    const results = await ExamMark.find(filter)
      .populate('student', 'name rollNumber studentId class')
      .populate('exam', 'examName subject date totalMarks passingMarks')
      .sort({ 'exam.date': -1 })
      .lean();
    
    // Calculate statistics
    const totalStudents = results.length;
    const passed = results.filter(r => r.status === 'Pass').length;
    const failed = results.filter(r => r.status === 'Fail').length;
    const averageMarks = totalStudents > 0
      ? results.reduce((sum, r) => sum + (r.marksObtained || 0), 0) / totalStudents
      : 0;
    const averagePercentage = totalStudents > 0
      ? results.reduce((sum, r) => sum + (r.percentage || 0), 0) / totalStudents
      : 0;
    
    res.json({
      success: true,
      data: {
        results,
        statistics: {
          totalStudents,
          passed,
          failed,
          averageMarks: Math.round(averageMarks * 100) / 100,
          averagePercentage: Math.round(averagePercentage * 100) / 100,
          passPercentage: totalStudents > 0 ? Math.round((passed / totalStudents) * 100 * 100) / 100 : 0
        }
      }
    });
  } catch (error) {
    console.error('Exam results report error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== FEE REPORTS ==========

// Fee Collection Report
router.get('/fee/collection', async (req, res) => {
  try {
    const { class: className, dateFrom, dateTo, status, academicYear, currency } = req.query;
    
    let filter = {};
    if (className) {
      const students = await Student.find({ class: className, isActive: true });
      filter.student = { $in: students.map(s => s._id) };
    }
    if (status) filter.status = status;
    if (academicYear) filter.academicYear = academicYear;
    if (currency) filter.currency = currency;
    
    if (dateFrom || dateTo) {
      filter.dueDate = {};
      if (dateFrom) {
        const dateFromObj = new Date(dateFrom);
        dateFromObj.setUTCHours(0, 0, 0, 0);
        filter.dueDate.$gte = dateFromObj;
      }
      if (dateTo) {
        const dateToObj = new Date(dateTo);
        dateToObj.setUTCHours(23, 59, 59, 999);
        filter.dueDate.$lte = dateToObj;
      }
    }
    
    const fees = await Fee.find(filter)
      .populate('student', 'name rollNumber studentId class')
      .sort({ dueDate: -1 })
      .lean();
    
    // Calculate statistics
    const totalFees = fees.length;
    const totalAmount = fees.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
    const totalPaid = fees.reduce((sum, f) => sum + (Number(f.paidAmount) || 0), 0);
    const totalDiscount = fees.reduce((sum, f) => sum + (Number(f.discount) || 0), 0);
    
    // Calculate pending: Only count fees that are not fully paid
    const totalPending = fees.reduce((sum, f) => {
      if (f.status === 'Paid') return sum;
      const feePending = Math.max(0, (Number(f.amount) || 0) - (Number(f.paidAmount) || 0) - (Number(f.discount) || 0));
      return sum + feePending;
    }, 0);
    
    // Status breakdown
    const paid = fees.filter(f => f.status === 'Paid').length;
    const pending = fees.filter(f => f.status === 'Pending' || f.status === 'Overdue' || f.status === 'Partial').length;
    const overdue = fees.filter(f => f.status === 'Overdue').length;
    const partial = fees.filter(f => f.status === 'Partial').length;
    
    // Monthly breakdown
    const monthlyBreakdown = {};
    fees.forEach(fee => {
      const month = fee.month || (fee.dueDate ? new Date(fee.dueDate).toISOString().slice(0, 7) : 'Unknown');
      if (!monthlyBreakdown[month]) {
        monthlyBreakdown[month] = { amount: 0, paid: 0, pending: 0, count: 0 };
      }
      monthlyBreakdown[month].amount += Number(fee.amount) || 0;
      monthlyBreakdown[month].paid += Number(fee.paidAmount) || 0;
      // Calculate pending for this fee
      const feePending = fee.status === 'Paid' ? 0 : Math.max(0, (Number(fee.amount) || 0) - (Number(fee.paidAmount) || 0) - (Number(fee.discount) || 0));
      monthlyBreakdown[month].pending += feePending;
      monthlyBreakdown[month].count += 1;
    });
    
    res.json({
      success: true,
      data: {
        fees,
        monthlyBreakdown,
        statistics: {
          totalFees,
          totalAmount,
          totalPaid,
          totalPending,
          totalDiscount,
          paid,
          pending,
          overdue,
          partial,
          collectionPercentage: totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100 * 100) / 100 : 0
        }
      }
    });
  } catch (error) {
    console.error('Fee collection report error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== ATTENDANCE REPORTS ==========

// Overall Attendance Report
router.get('/attendance/overall', async (req, res) => {
  try {
    const { type, class: className, dateFrom, dateTo, academicYear } = req.query;
    
    let filter = {};
    if (type) filter.type = type;
    if (className) filter.class = className;
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
      .populate('student', 'name rollNumber studentId class')
      .populate('teacher', 'name teacherId')
      .sort({ date: -1 })
      .lean();
    
    // Calculate statistics
    const totalRecords = attendance.length;
    const present = attendance.filter(a => a.status === 'present').length;
    const absent = attendance.filter(a => a.status === 'absent').length;
    const late = attendance.filter(a => a.status === 'late').length;
    const excused = attendance.filter(a => a.status === 'excused').length;
    const halfDay = attendance.filter(a => a.status === 'half-day').length;
    
    // Daily breakdown
    const dailyBreakdown = {};
    attendance.forEach(record => {
      const date = record.date.toISOString().split('T')[0];
      if (!dailyBreakdown[date]) {
        dailyBreakdown[date] = { present: 0, absent: 0, late: 0, excused: 0, halfDay: 0, total: 0 };
      }
      dailyBreakdown[date][record.status] = (dailyBreakdown[date][record.status] || 0) + 1;
      dailyBreakdown[date].total += 1;
    });
    
    res.json({
      success: true,
      data: {
        attendance,
        dailyBreakdown,
        statistics: {
          totalRecords,
          present,
          absent,
          late,
          excused,
          halfDay,
          attendancePercentage: totalRecords > 0 ? Math.round((present / totalRecords) * 100 * 100) / 100 : 0
        }
      }
    });
  } catch (error) {
    console.error('Overall attendance report error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== DASHBOARD/OVERVIEW REPORTS ==========

// System Overview Report
router.get('/overview', async (req, res) => {
  try {
    const { academicYear } = req.query;
    
    // Get counts
    const totalStudents = await Student.countDocuments({ isActive: true });
    const totalTeachers = await Teacher.countDocuments({ isActive: true });
    const totalClasses = await Class.countDocuments({ isActive: true });
    
    let examFilter = {};
    if (academicYear) examFilter.academicYear = academicYear;
    const totalExams = await Exam.countDocuments(examFilter);
    
    // Attendance statistics
    let attendanceFilter = { type: 'student' };
    if (academicYear) attendanceFilter.academicYear = academicYear;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    
    attendanceFilter.date = { $gte: today, $lt: tomorrow };
    const todayAttendance = await Attendance.find(attendanceFilter).lean();
    const todayPresent = todayAttendance.filter(a => a.status === 'present').length;
    const todayAbsent = todayAttendance.filter(a => a.status === 'absent').length;
    
    // Fee statistics
    let feeFilter = {};
    if (academicYear) feeFilter.academicYear = academicYear;
    const totalFees = await Fee.countDocuments(feeFilter);
    const fees = await Fee.find(feeFilter).lean();
    const totalFeeAmount = fees.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
    const totalFeePaid = fees.reduce((sum, f) => sum + (Number(f.paidAmount) || 0), 0);
    const totalDiscount = fees.reduce((sum, f) => sum + (Number(f.discount) || 0), 0);
    
    // Calculate pending: Only count fees that are not fully paid
    const totalPending = fees.reduce((sum, f) => {
      if (f.status === 'Paid') return sum;
      const feePending = Math.max(0, (Number(f.amount) || 0) - (Number(f.paidAmount) || 0) - (Number(f.discount) || 0));
      return sum + feePending;
    }, 0);
    
    const pendingFees = fees.filter(f => f.status === 'Pending' || f.status === 'Overdue' || f.status === 'Partial').length;
    
    // Results statistics
    let resultFilter = {};
    if (academicYear) resultFilter.academicYear = academicYear;
    const totalResults = await ExamMark.countDocuments(resultFilter);
    const results = await ExamMark.find(resultFilter).lean();
    const passedResults = results.filter(r => r.status === 'Pass').length;
    const failedResults = results.filter(r => r.status === 'Fail').length;
    
    res.json({
      success: true,
      data: {
        overview: {
          totalStudents,
          totalTeachers,
          totalClasses,
          totalExams,
          totalFees,
          totalResults
        },
        attendance: {
          todayPresent,
          todayAbsent,
          todayTotal: todayAttendance.length
        },
        fees: {
          totalAmount: totalFeeAmount,
          totalPaid: totalFeePaid,
          totalPending: totalPending,
          totalDiscount: totalDiscount,
          pendingCount: pendingFees,
          collectionPercentage: totalFeeAmount > 0 ? Math.round((totalFeePaid / totalFeeAmount) * 100 * 100) / 100 : 0
        },
        results: {
          totalResults,
          passed: passedResults,
          failed: failedResults,
          passPercentage: totalResults > 0 ? Math.round((passedResults / totalResults) * 100 * 100) / 100 : 0
        }
      }
    });
  } catch (error) {
    console.error('Overview report error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== EXPORT FUNCTIONS ==========

// Export report to Excel
router.get('/export/:reportType', async (req, res) => {
  try {
    const { reportType } = req.params;
    const queryParams = req.query;
    
    // Route to appropriate report endpoint
    let reportData = null;
    const baseUrl = req.protocol + '://' + req.get('host');
    
    // Fetch report data based on type
    // This is a simplified version - in production, you'd call the report functions directly
    res.status(501).json({ success: false, message: 'Export functionality coming soon' });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
