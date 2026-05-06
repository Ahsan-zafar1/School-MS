const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

/**
 * GET /api/users
 * Get all users (without password). Admin only.
 */
router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 }).lean();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});

/**
 * POST /api/users
 * Create a new user. Admin only. Requires: name, password, role. Login: email OR username (at least one).
 */
router.post('/', async (req, res) => {
  try {
    const { name, email, username, password, role } = req.body;
    if (!name || !password) {
      return res.status(400).json({ message: 'Name and password are required' });
    }
    const em = (email || '').trim().toLowerCase() || null;
    const un = (username || '').trim().toLowerCase() || null;
    if (!em && !un) {
      return res.status(400).json({ message: 'Email or username is required for login' });
    }
    if (em && (await User.findOne({ email: em }))) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    if (un && (await User.findOne({ username: un }))) {
      return res.status(400).json({ message: 'User with this username already exists' });
    }
    const user = await User.create({
      name: (name || '').trim(),
      email: em,
      username: un,
      password: password,
      role: role || 'user'
    });
    const safe = user.toObject ? user.toObject() : user;
    delete safe.password;
    res.status(201).json(safe);
  } catch (error) {
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
});

/**
 * PUT /api/users/:id/reset-password
 * Set a new password for the user. Admin only. Must be defined before PUT /:id.
 */
router.put('/:id/reset-password', async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password is required (min 6 characters)' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error resetting password', error: error.message });
  }
});

/**
 * PUT /api/users/:id
 * Update user (name, email, username, role). Admin only. Does not change password. At least one of email/username must remain.
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, email, username, role } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (name !== undefined) user.name = name.trim();
    if (email !== undefined) {
      const em = (email || '').trim().toLowerCase() || null;
      if (em) {
        const existing = await User.findOne({ email: em, _id: { $ne: req.params.id } });
        if (existing) return res.status(400).json({ message: 'Email already in use' });
      }
      user.email = em;
    }
    if (username !== undefined) {
      const un = (username || '').trim().toLowerCase() || null;
      if (un) {
        const existing = await User.findOne({ username: un, _id: { $ne: req.params.id } });
        if (existing) return res.status(400).json({ message: 'Username already in use' });
      }
      user.username = un;
    }
    if (role !== undefined) user.role = role;
    const hasLogin = (user.email != null && String(user.email).trim() !== '') || (user.username != null && String(user.username).trim() !== '');
    if (!hasLogin) return res.status(400).json({ message: 'User must have email or username for login' });
    await user.save();
    const safe = user.toObject ? user.toObject() : user;
    delete safe.password;
    res.json(safe);
  } catch (error) {
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
});

/**
 * DELETE /api/users/:id
 * Delete user by id. Admin only.
 */
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user', error: error.message });
  }
});

module.exports = router;
