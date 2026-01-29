const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  classId: {
    type: String,
    unique: true,
    sparse: true
  },
  name: {
    type: String,
    required: [true, 'Please add a class name'],
    trim: true
  },
  grade: {
    type: String,
    trim: true
  },
  section: {
    type: String,
    required: [true, 'Please add a section'],
    trim: true
  },
  classTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher'
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  subjects: [{
    name: String,
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher'
    }
  }],
  schedule: [{
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    },
    periods: [{
      subject: String,
      teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher'
      },
      startTime: String,
      endTime: String
    }]
  }],
  capacity: {
    type: Number,
    default: 40
  },
  roomNumber: {
    type: String,
    trim: true
  },
  academicYear: {
    type: String,
    required: [true, 'Please add academic year']
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Pre-save hook to auto-generate classId
classSchema.pre('save', async function(next) {
  if (this.isNew || !this.classId) {
    let nextSequenceNumber = 1;
    const lastClass = await this.constructor.findOne()
      .sort({ classId: -1 })
      .select('classId')
      .lean();

    if (lastClass && lastClass.classId) {
      const match = lastClass.classId.match(/CLS-(\d+)$/);
      if (match) {
        nextSequenceNumber = parseInt(match[1], 10) + 1;
      }
    }
    this.classId = `CLS-${nextSequenceNumber.toString().padStart(6, '0')}`;
  }
  next();
});

// Virtual field for current student count
classSchema.virtual('studentCount').get(function() {
  return this.students ? this.students.length : 0;
});

// Index for faster queries
classSchema.index({ name: 1, section: 1, academicYear: 1 }, { unique: true });
classSchema.index({ classId: 1 });
classSchema.index({ isActive: 1 });
classSchema.index({ academicYear: 1 });

module.exports = mongoose.model('Class', classSchema); 