const express = require('express');
const router = express.Router();
const {
  getSettings,
  updateSettings,
  updateSchoolInfo,
  updateAcademicSettings,
  updateSystemSettings,
  updateEmailSettings,
  updateSMSSettings,
  updateBackupSettings,
  updateFeatures
} = require('../controllers/settingsController');
const { protect, authorize } = require('../middleware/auth');

// GET settings: any authenticated user (students/teachers need it for portal)
router.get('/', protect, getSettings);

// All write operations require admin
router.use(protect);
router.use(authorize('admin'));

/**
 * @swagger
 * /api/settings:
 *   get:
 *     summary: Get system settings (any authenticated user)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Settings retrieved successfully
 */

/**
 * @swagger
 * /api/settings:
 *   put:
 *     summary: Update all settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Settings updated successfully
 */
router.put('/', updateSettings);

/**
 * @swagger
 * /api/settings/school-info:
 *   put:
 *     summary: Update school information
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: School information updated successfully
 */
router.put('/school-info', updateSchoolInfo);

/**
 * @swagger
 * /api/settings/academic:
 *   put:
 *     summary: Update academic settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Academic settings updated successfully
 */
router.put('/academic', updateAcademicSettings);

/**
 * @swagger
 * /api/settings/system:
 *   put:
 *     summary: Update system settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System settings updated successfully
 */
router.put('/system', updateSystemSettings);

/**
 * @swagger
 * /api/settings/email:
 *   put:
 *     summary: Update email settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Email settings updated successfully
 */
router.put('/email', updateEmailSettings);

/**
 * @swagger
 * /api/settings/sms:
 *   put:
 *     summary: Update SMS settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: SMS settings updated successfully
 */
router.put('/sms', updateSMSSettings);

/**
 * @swagger
 * /api/settings/backup:
 *   put:
 *     summary: Update backup settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backup settings updated successfully
 */
router.put('/backup', updateBackupSettings);

/**
 * @swagger
 * /api/settings/features:
 *   put:
 *     summary: Update feature toggles
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Features updated successfully
 */
router.put('/features', updateFeatures);

module.exports = router;
