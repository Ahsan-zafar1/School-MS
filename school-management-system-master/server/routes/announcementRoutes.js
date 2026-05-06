const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Announcement = require('../models/Announcement');
const { protect, authorize } = require('../middleware/auth');

function validAnnouncementId(id) {
  return id && mongoose.Types.ObjectId.isValid(id) && String(id).length === 24;
}

// Admin: list all announcements (same data teachers/students see, unfiltered)
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const list = await Announcement.find({ isActive: true })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: list, count: list.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: create announcement (any targetClasses or targetType 'all')
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { title, message, targetType, targetClasses } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'title and message required.' });
    }
    const doc = await Announcement.create({
      title: title.trim(),
      message: message.trim(),
      createdBy: req.user._id,
      targetType: targetType === 'all' ? 'all' : 'class',
      targetClasses: Array.isArray(targetClasses) ? targetClasses : [],
      isActive: true
    });
    const populated = await Announcement.findById(doc._id).populate('createdBy', 'name email').lean();
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: update announcement
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const id = req.params.id;
    if (!validAnnouncementId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid announcement ID.' });
    }
    const { title, message, targetType, targetClasses } = req.body;
    const doc = await Announcement.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Announcement not found. It may have been deleted or the ID is wrong.' });
    if (title !== undefined) doc.title = title.trim();
    if (message !== undefined) doc.message = message.trim();
    if (targetType !== undefined) doc.targetType = targetType === 'all' ? 'all' : 'class';
    if (targetClasses !== undefined) doc.targetClasses = Array.isArray(targetClasses) ? targetClasses : [];
    await doc.save();
    const populated = await Announcement.findById(doc._id).populate('createdBy', 'name email').lean();
    res.json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: delete announcement (soft: set isActive false)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const id = req.params.id;
    if (!validAnnouncementId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid announcement ID.' });
    }
    const doc = await Announcement.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Announcement not found. It may have been deleted or the ID is wrong.' });
    doc.isActive = false;
    await doc.save();
    res.json({ success: true, message: 'Announcement deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
