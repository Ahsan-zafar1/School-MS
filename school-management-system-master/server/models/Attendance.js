const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  attendanceId: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  // Support both students and teachers
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: false
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: false
  },
  // Type: 'student' or 'teacher'
  type: {
    type: String,
    enum: ['student', 'teacher'],
    required: true,
    index: true
  },
  class: {
    type: String,
    required: function() { return this.type === 'student'; }
  },
  subject: {
    type: String,
    required: false // Optional: for subject-specific attendance
  },
  academicYear: {
    type: String,
    required: false
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'excused', 'half-day', 'unmarked'],
    default: 'unmarked',
    required: true
  },
  // Time tracking
  checkInTime: {
    type: Date,
    required: false
  },
  checkOutTime: {
    type: Date,
    required: false
  },
  // Late arrival tracking
  isLate: {
    type: Boolean,
    default: false
  },
  lateMinutes: {
    type: Number,
    default: 0
  },
  // Early departure tracking
  isEarlyDeparture: {
    type: Boolean,
    default: false
  },
  earlyDepartureMinutes: {
    type: Number,
    default: 0
  },
  // Attendance machine integration
  recordedBy: {
    type: String,
    enum: ['manual', 'machine', 'api'],
    default: 'manual'
  },
  machineId: {
    type: String,
    required: false // ID of the attendance machine that recorded this
  },
  machineRecordId: {
    type: String,
    required: false // Record ID from the attendance machine
  },
  biometricData: {
    type: String,
    required: false // Encrypted biometric reference (fingerprint, face ID, etc.)
  },
  remarks: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Pre-save hook to generate attendanceId
attendanceSchema.pre('save', async function(next) {
  if (this.isNew && !this.attendanceId) {
    let isUnique = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 10;
    
    while (!isUnique && attempts < MAX_ATTEMPTS) {
      try {
        const Attendance = mongoose.model('Attendance');
        let nextSequenceNumber = 1;
        
        const lastAttendance = await Attendance.findOne()
          .sort({ attendanceId: -1 })
          .select('attendanceId')
          .lean();
        
        if (lastAttendance && lastAttendance.attendanceId) {
          const match = lastAttendance.attendanceId.match(/ATT-(\d+)$/);
          if (match) {
            nextSequenceNumber = parseInt(match[1], 10) + 1;
          }
        }
        
        this.attendanceId = `ATT-${nextSequenceNumber.toString().padStart(6, '0')}`;
        
        const existing = await Attendance.findOne({ attendanceId: this.attendanceId });
        if (!existing || existing._id.toString() === this._id.toString()) {
          isUnique = true;
        } else {
          nextSequenceNumber++;
          attempts++;
        }
      } catch (error) {
        console.error('Error generating attendanceId:', error);
        this.attendanceId = `ATT-${Date.now().toString().slice(-6)}`;
        isUnique = true;
      }
    }
    
    if (!isUnique) {
      this.attendanceId = `ATT-${Date.now().toString().slice(-6)}`;
    }
  }
  
  // Ensure either student or teacher is set based on type
  if (this.type === 'student' && !this.student) {
    return next(new Error('Student is required for student attendance'));
  }
  if (this.type === 'teacher' && !this.teacher) {
    return next(new Error('Teacher is required for teacher attendance'));
  }
  
  // Set academic year if not provided
  if (!this.academicYear && this.date) {
    this.academicYear = new Date(this.date).getFullYear().toString();
  }
  
  next();
});

// Create compound indexes for unique attendance records
// Note: The partialFilterExpression ensures these indexes only apply to their respective types
// This prevents conflicts between student and teacher attendance records
attendanceSchema.index(
  { date: 1, student: 1 }, 
  { 
    unique: true, 
    sparse: true, 
    partialFilterExpression: { type: 'student', student: { $exists: true, $ne: null } },
    name: 'date_student_unique'
  }
);
attendanceSchema.index(
  { date: 1, teacher: 1 }, 
  { 
    unique: true, 
    sparse: true, 
    partialFilterExpression: { type: 'teacher', teacher: { $exists: true, $ne: null } },
    name: 'date_teacher_unique'
  }
);
attendanceSchema.index({ date: 1, class: 1 });
attendanceSchema.index({ type: 1, date: 1 });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ recordedBy: 1 });
attendanceSchema.index({ machineId: 1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance; 