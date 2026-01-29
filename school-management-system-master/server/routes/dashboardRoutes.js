const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const { protect } = require('../middleware/auth');
const Fee = require('../models/Fee');
const Attendance = require('../models/Attendance');
const ExamMark = require('../models/ExamMark');
const Exam = require('../models/Exam');
const Activity = require('../models/Activity');

// Get dashboard overview statistics
router.get('/overview', protect, async (req, res) => {
  try {
    // Get counts for students, teachers, and classes
    const [studentCount, teacherCount, classCount] = await Promise.all([
      Student.countDocuments(),
      Teacher.countDocuments(),
      Class.countDocuments()
    ]);

    // Get total fees collected
    const totalFeesResult = await Payment.aggregate([
      {
        $match: { status: 'Paid' }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const totalFees = totalFeesResult.length > 0 ? totalFeesResult[0].total : 0;

    res.json({
      success: true,
      data: {
        totalStudents: studentCount,
        totalTeachers: teacherCount,
        totalClasses: classCount,
        totalFees: totalFees
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard overview',
      error: error.message
    });
  }
});

// Get payment statistics
router.get('/payment-stats', protect, async (req, res) => {
  try {
    const totalPayments = await Payment.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const paymentsByType = await Payment.aggregate([
      {
        $group: {
          _id: '$paymentType',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const paymentsByStatus = await Payment.aggregate([
      {
        $group: {
          _id: '$status',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        totalPayments: totalPayments[0] || { total: 0, count: 0 },
        paymentsByType,
        paymentsByStatus
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching payment statistics',
      error: error.message
    });
  }
});

// Get monthly statistics
router.get('/monthly-stats', protect, async (req, res) => {
  try {
    const monthlyStats = await Payment.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          amount: { $sum: '$amount' },
          count: { $sum: 1 }
          }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      },
      {
        $limit: 12
      },
      {
        $project: {
          _id: 0,
          month: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              {
                $cond: {
                  if: { $lt: ['$_id.month', 10] },
                  then: { $concat: ['0', { $toString: '$_id.month' }] },
                  else: { $toString: '$_id.month' }
                }
              }
            ]
          },
          amount: 1,
          count: 1
        }
      }
    ]);

    res.json({
      success: true,
      data: monthlyStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching monthly statistics',
      error: error.message
    });
  }
});

// Get recent payments
router.get('/recent-payments', protect, async (req, res) => {
  try {
    const recentPayments = await Payment.find()
      .populate('student', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: recentPayments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching recent payments',
      error: error.message
    });
  }
});

// @desc    Get dashboard data
// @route   GET /api/dashboard
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    // Get summary data - count only active records
    const [totalStudents, totalTeachers, totalClasses] = await Promise.all([
      Student.countDocuments({ isActive: true }),
      Teacher.countDocuments({ isActive: true }),
      Class.countDocuments({ isActive: true })
    ]);
    
    // Calculate total revenue from paid fees (check multiple status values and use paidAmount)
    const paidFees = await Fee.find({ 
      status: { $in: ['Paid', 'paid', 'PAID'] } 
    }).lean();
    const totalRevenue = paidFees.reduce((sum, fee) => {
      // Use paidAmount if available, otherwise use amount for paid fees
      return sum + (Number(fee.paidAmount) || Number(fee.amount) || 0);
    }, 0);
    
    // Calculate growth percentages (compare with last month)
    const now = new Date();
    const lastMonth = new Date(now);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    const [currentMonthStudents, lastMonthStudents] = await Promise.all([
      Student.countDocuments({ 
        isActive: true,
        createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) }
      }),
      Student.countDocuments({ 
        isActive: true,
        createdAt: { 
          $gte: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
          $lt: new Date(now.getFullYear(), now.getMonth(), 1)
        }
      })
    ]);
    
    const [currentMonthTeachers, lastMonthTeachers] = await Promise.all([
      Teacher.countDocuments({ 
        isActive: true,
        createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) }
      }),
      Teacher.countDocuments({ 
        isActive: true,
        createdAt: { 
          $gte: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
          $lt: new Date(now.getFullYear(), now.getMonth(), 1)
        }
      })
    ]);
    
    const studentGrowth = lastMonthStudents > 0 
      ? ((currentMonthStudents / lastMonthStudents) * 100 - 100).toFixed(1)
      : currentMonthStudents > 0 ? '100.0' : '0.0';
    
    const teacherGrowth = lastMonthTeachers > 0 
      ? ((currentMonthTeachers / lastMonthTeachers) * 100 - 100).toFixed(1)
      : currentMonthTeachers > 0 ? '100.0' : '0.0';
    
    // Get monthly revenue for last 6 months
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyRevenueData = await Fee.aggregate([
      {
        $match: {
          status: { $in: ['Paid', 'paid', 'PAID'] },
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: { $ifNull: ['$paidAmount', '$amount'] } }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyRevenue = monthlyRevenueData.map(item => ({
      month: monthNames[item._id.month - 1],
      revenue: item.revenue || 0
    }));
    
    // Fill in missing months with 0
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      const monthName = monthNames[date.getMonth()];
      const existing = monthlyRevenue.find(m => m.month === monthName);
      last6Months.push(existing || { month: monthName, revenue: 0 });
    }
    
    // Get attendance data for the last 7 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const attendanceData = await Attendance.find({
      date: { $gte: sevenDaysAgo, $lte: today }
    }).sort({ date: 1 }).lean();
    
    // Process attendance data for chart - group by day of week
    const attendanceByDay = {};
    attendanceData.forEach(record => {
      const date = new Date(record.date);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      
      if (!attendanceByDay[dayName]) {
        attendanceByDay[dayName] = { present: 0, absent: 0 };
      }
      
      if (record.status === 'present' || record.status === 'Present') {
        attendanceByDay[dayName].present++;
      } else if (record.status === 'absent' || record.status === 'Absent') {
        attendanceByDay[dayName].absent++;
      }
    });
    
    // Format attendance data for chart - last 7 days
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const attendanceDataFormatted = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const dayData = attendanceByDay[dayName] || { present: 0, absent: 0 };
      attendanceDataFormatted.push({
        date: dayName,
        present: dayData.present,
        absent: dayData.absent
      });
    }
    
    // Get recent activities from Activity model
    const recentActivities = await Activity.find()
      .sort({ timestamp: -1 })
      .limit(10)
      .populate('user', 'name')
      .lean();
    
    const formattedActivities = recentActivities.map((activity, index) => ({
      id: activity._id.toString() || `activity-${index}`,
      action: activity.action.charAt(0).toUpperCase() + activity.action.slice(1),
      description: activity.description,
      timestamp: activity.timestamp || activity.createdAt,
      user: activity.user?.name || 'System'
    }));
    
    res.json({
      success: true,
      data: {
        summary: {
          totalStudents,
          totalTeachers,
          totalClasses,
          totalRevenue
        },
        growth: {
          studentGrowth: parseFloat(studentGrowth),
          teacherGrowth: parseFloat(teacherGrowth)
        },
        monthlyRevenue: last6Months,
        attendance: {
          labels: attendanceDataFormatted.map(d => d.date),
          present: attendanceDataFormatted.map(d => d.present),
          absent: attendanceDataFormatted.map(d => d.absent)
        },
        recentActivities: formattedActivities
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dashboard data',
      error: error.message
    });
  }
});

module.exports = router; 