const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: ['create', 'update', 'delete', 'login', 'logout', 'other']
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: '📝'
  },
  entityType: {
    type: String,
    required: true,
    enum: ['user', 'student', 'teacher', 'class', 'fee', 'attendance', 'other']
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
activitySchema.index({ timestamp: -1 });
activitySchema.index({ user: 1, timestamp: -1 });
activitySchema.index({ entityType: 1, entityId: 1 });

const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity; 