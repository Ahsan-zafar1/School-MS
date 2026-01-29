const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  teacherId: {
    type: String,
    unique: true,
    index: true // Add index for faster lookups
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    type: String, // Changed from nested object to string for consistency
    default: ''
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    lowercase: true
  },
  subject: {
    type: String, // Single subject for simplicity (can be extended to array later)
    trim: true
  },
  subjects: [{
    type: String,
    trim: true
  }],
  qualification: {
    type: String, // Changed from nested object to string for simplicity
    default: ''
  },
  experience: {
    type: Number, // Changed from nested object to number
    default: 0
  },
  joiningDate: {
    type: Date,
    default: Date.now
  },
  salary: {
    type: Number,
    default: 0
  },
  classes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  }],
  photo: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Pre-save hook to generate teacherId
teacherSchema.pre('save', async function(next) {
  // Generate unique teacher ID for teachers without one (new teachers or existing without ID)
  if (!this.teacherId) {
    // Find the highest teacher ID
    const lastTeacher = await this.constructor.findOne()
      .sort({ teacherId: -1 })
      .select('teacherId')
      .lean();
    
    let nextSequenceNumber = 1;
    
    if (lastTeacher && lastTeacher.teacherId) {
      // Extract number from format TCH-XXX
      const match = lastTeacher.teacherId.match(/TCH-(\d+)$/);
      if (match) {
        const sequenceNum = parseInt(match[1], 10);
        nextSequenceNumber = sequenceNum + 1;
      }
    }
    
    // Format: TCH-XXX (e.g., TCH-000001, TCH-000002)
    this.teacherId = `TCH-${nextSequenceNumber.toString().padStart(6, '0')}`;
    console.log(`[PRE-SAVE HOOK] Generated teacher ID: ${this.teacherId}${this.isNew ? ' (new teacher)' : ' (existing teacher without ID)'}`);
  }
  next();
});

const Teacher = mongoose.model('Teacher', teacherSchema);

module.exports = Teacher; 