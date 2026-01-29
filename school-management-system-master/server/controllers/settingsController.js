const Settings = require('../models/Settings');
const asyncHandler = require('express-async-handler');

/**
 * @desc    Get settings
 * @route   GET /api/settings
 * @access  Private (Admin only)
 */
exports.getSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.getSettings();
  res.json({
    success: true,
    data: settings
  });
});

/**
 * @desc    Update settings
 * @route   PUT /api/settings
 * @access  Private (Admin only)
 */
exports.updateSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne();
  
  if (!settings) {
    settings = await Settings.create(req.body);
  } else {
    // Update nested objects properly
    if (req.body.schoolInfo) {
      settings.schoolInfo = { ...settings.schoolInfo, ...req.body.schoolInfo };
    }
    if (req.body.academicSettings) {
      settings.academicSettings = { ...settings.academicSettings, ...req.body.academicSettings };
    }
    if (req.body.systemSettings) {
      settings.systemSettings = { ...settings.systemSettings, ...req.body.systemSettings };
    }
    if (req.body.emailSettings) {
      settings.emailSettings = { ...settings.emailSettings, ...req.body.emailSettings };
    }
    if (req.body.smsSettings) {
      settings.smsSettings = { ...settings.smsSettings, ...req.body.smsSettings };
    }
    if (req.body.backupSettings) {
      settings.backupSettings = { ...settings.backupSettings, ...req.body.backupSettings };
    }
    if (req.body.features) {
      settings.features = { ...settings.features, ...req.body.features };
    }
    
    await settings.save();
  }

  res.json({
    success: true,
    message: 'Settings updated successfully',
    data: settings
  });
});

/**
 * @desc    Update school information
 * @route   PUT /api/settings/school-info
 * @access  Private (Admin only)
 */
exports.updateSchoolInfo = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne();
  
  if (!settings) {
    settings = await Settings.create({});
  }
  
  settings.schoolInfo = { ...settings.schoolInfo, ...req.body };
  await settings.save();

  res.json({
    success: true,
    message: 'School information updated successfully',
    data: settings.schoolInfo
  });
});

/**
 * @desc    Update academic settings
 * @route   PUT /api/settings/academic
 * @access  Private (Admin only)
 */
exports.updateAcademicSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne();
  
  if (!settings) {
    settings = await Settings.create({});
  }
  
  settings.academicSettings = { ...settings.academicSettings, ...req.body };
  await settings.save();

  res.json({
    success: true,
    message: 'Academic settings updated successfully',
    data: settings.academicSettings
  });
});

/**
 * @desc    Update system settings
 * @route   PUT /api/settings/system
 * @access  Private (Admin only)
 */
exports.updateSystemSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne();
  
  if (!settings) {
    settings = await Settings.create({});
  }
  
  settings.systemSettings = { ...settings.systemSettings, ...req.body };
  await settings.save();

  res.json({
    success: true,
    message: 'System settings updated successfully',
    data: settings.systemSettings
  });
});

/**
 * @desc    Update email settings
 * @route   PUT /api/settings/email
 * @access  Private (Admin only)
 */
exports.updateEmailSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne();
  
  if (!settings) {
    settings = await Settings.create({});
  }
  
  settings.emailSettings = { ...settings.emailSettings, ...req.body };
  await settings.save();

  res.json({
    success: true,
    message: 'Email settings updated successfully',
    data: settings.emailSettings
  });
});

/**
 * @desc    Update SMS settings
 * @route   PUT /api/settings/sms
 * @access  Private (Admin only)
 */
exports.updateSMSSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne();
  
  if (!settings) {
    settings = await Settings.create({});
  }
  
  settings.smsSettings = { ...settings.smsSettings, ...req.body };
  await settings.save();

  res.json({
    success: true,
    message: 'SMS settings updated successfully',
    data: settings.smsSettings
  });
});

/**
 * @desc    Update backup settings
 * @route   PUT /api/settings/backup
 * @access  Private (Admin only)
 */
exports.updateBackupSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne();
  
  if (!settings) {
    settings = await Settings.create({});
  }
  
  settings.backupSettings = { ...settings.backupSettings, ...req.body };
  if (req.body.autoBackup) {
    settings.backupSettings.lastBackup = new Date();
  }
  await settings.save();

  res.json({
    success: true,
    message: 'Backup settings updated successfully',
    data: settings.backupSettings
  });
});

/**
 * @desc    Update feature toggles
 * @route   PUT /api/settings/features
 * @access  Private (Admin only)
 */
exports.updateFeatures = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne();
  
  if (!settings) {
    settings = await Settings.create({});
  }
  
  settings.features = { ...settings.features, ...req.body };
  await settings.save();

  res.json({
    success: true,
    message: 'Features updated successfully',
    data: settings.features
  });
});
