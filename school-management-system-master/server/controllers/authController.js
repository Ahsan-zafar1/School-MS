const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// Register user – email or username (at least one required)
exports.register = async (req, res) => {
  try {
    const { name, email, username, password, role } = req.body;
    const em = (email || '').trim().toLowerCase() || null;
    const un = (username || '').trim().toLowerCase() || null;
    if (!em && !un) {
      return res.status(400).json({
        success: false,
        message: 'Email or username is required'
      });
    }
    if (em && (await User.findOne({ email: em }))) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }
    if (un && (await User.findOne({ username: un }))) {
      return res.status(400).json({ success: false, message: 'User with this username already exists' });
    }

    const user = await User.create({
      name: name || 'User',
      email: em,
      username: un,
      password: password,
      role: role || 'student'
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error in user registration',
      error: error.message
    });
  }
};

// Login user – by email OR username (for users without email)
exports.login = async (req, res) => {
  try {
    const { email, username, password } = req.body;
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }
    const byEmail = (email || '').trim().toLowerCase();
    const byUsername = (username || '').trim().toLowerCase();
    if (!byEmail && !byUsername) {
      return res.status(400).json({
        success: false,
        message: 'Email or username is required'
      });
    }

    let user = null;
    if (byEmail) {
      user = await User.findOne({ email: byEmail }).select('+password');
    } else {
      user = await User.findOne({ username: byUsername }).select('+password');
    }
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error in login',
      error: error.message
    });
  }
}; 