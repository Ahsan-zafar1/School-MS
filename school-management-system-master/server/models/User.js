const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: false,
    default: null,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true
  },
  username: {
    type: String,
    required: false,
    default: null,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'teacher', 'student', 'user'],
    default: 'user'
  },
  // Optional ObjectId links to Student/Teacher (backward-compatible: email linking still supported)
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: false,
    default: null
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: false,
    default: null
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.pre('save', function (next) {
  const hasEmail = this.email != null && String(this.email).trim() !== '';
  const hasUsername = this.username != null && String(this.username).trim() !== '';
  if (!hasEmail && !hasUsername) {
    return next(new Error('Either email or username is required'));
  }
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User; 