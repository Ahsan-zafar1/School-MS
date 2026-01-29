const express = require('express');
const router = express.Router();
const Activity = require('../models/Activity');
const { protect, authorize } = require('../middleware/auth');

/**
 * @swagger
 * /api/activities/recent:
 *   get:
 *     summary: Get recent activities
 *     tags: [Activities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Recent activities retrieved successfully
 */
router.get('/recent', protect, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const activities = await Activity.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate('user', 'name')
      .lean();

    res.json(activities);
  } catch (error) {
    console.error('Recent activities error:', error);
    res.status(500).json({ message: 'Error fetching recent activities' });
  }
});

/**
 * @swagger
 * /api/activities/user/{userId}:
 *   get:
 *     summary: Get activities for a specific user
 *     tags: [Activities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User activities retrieved successfully
 */
router.get('/user/:userId', protect, async (req, res) => {
  try {
    const activities = await Activity.find({ user: req.params.userId })
      .sort({ timestamp: -1 })
      .limit(20)
      .populate('user', 'name')
      .lean();

    res.json(activities);
  } catch (error) {
    console.error('User activities error:', error);
    res.status(500).json({ message: 'Error fetching user activities' });
  }
});

/**
 * @swagger
 * /api/activities/entity/{type}/{id}:
 *   get:
 *     summary: Get activities for a specific entity
 *     tags: [Activities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Entity activities retrieved successfully
 */
router.get('/entity/:type/:id', protect, async (req, res) => {
  try {
    const activities = await Activity.find({
      entityType: req.params.type,
      entityId: req.params.id
    })
      .sort({ timestamp: -1 })
      .limit(20)
      .populate('user', 'name')
      .lean();

    res.json(activities);
  } catch (error) {
    console.error('Entity activities error:', error);
    res.status(500).json({ message: 'Error fetching entity activities' });
  }
});

// Utility function to log activities
const logActivity = async (user, action, description, entityType, entityId, metadata = {}) => {
  try {
    const icons = {
      create: '➕',
      update: '📝',
      delete: '🗑️',
      login: '🔑',
      logout: '👋',
      other: '📌'
    };

    const activity = new Activity({
      user: user._id,
      action,
      description,
      icon: icons[action] || '📝',
      entityType,
      entityId,
      metadata
    });

    await activity.save();
    return activity;
  } catch (error) {
    console.error('Activity logging error:', error);
    return null;
  }
};

module.exports = {
  router,
  logActivity
}; 