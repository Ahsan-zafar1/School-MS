// server/routes/statsRoutes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

/**
 * @swagger
 * /api/stats/dashboard:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Stats]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 *       401:
 *         description: Not authorized
 */
router.get('/dashboard', protect, authorize('admin'), async (req, res) => {
  try {
    // Get counts from different collections
    const [
      totalStudents,
      totalTeachers,
      totalClasses,
      feeStats
    ] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'teacher' }),
      mongoose.model('Class').countDocuments(),
      mongoose.model('Fee').aggregate([
        {
          $group: {
            _id: null,
            totalFees: { $sum: '$amount' },
            pendingFees: {
              $sum: {
                $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0]
              }
            }
          }
        }
      ])
    ]);

    // Calculate attendance percentage (example)
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const attendanceStats = await mongoose.model('Attendance').aggregate([
      {
        $match: {
          date: {
            $gte: startOfDay,
            $lte: endOfDay
          }
        }
      },
      {
        $group: {
          _id: null,
          totalPresent: {
            $sum: {
              $cond: [{ $eq: ['$status', 'present'] }, 1, 0]
            }
          },
          total: { $sum: 1 }
        }
      }
    ]);

    const attendancePercentage = attendanceStats.length > 0
      ? Math.round((attendanceStats[0].totalPresent / attendanceStats[0].total) * 100)
      : 0;

    res.json({
      totalStudents,
      totalTeachers,
      totalClasses,
      totalFees: feeStats.length > 0 ? feeStats[0].totalFees : 0,
      pendingFees: feeStats.length > 0 ? feeStats[0].pendingFees : 0,
      attendance: attendancePercentage
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Error fetching dashboard statistics' });
  }
});

module.exports = router;
