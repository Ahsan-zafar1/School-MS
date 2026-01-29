const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  examId: {
    type: String,
    unique: true,
    sparse: true
  },
  examName: {
    type: String,
    required: [true, 'Please add an exam name'],
    trim: true
  },
  examType: {
    type: String,
    enum: ['Midterm', 'Final', 'Quiz', 'Assignment', 'Project', 'Practical', 'Oral', 'Other'],
    default: 'Midterm'
  },
  subject: {
    type: String,
    required: [true, 'Please add a subject'],
    trim: true
  },
  class: {
    type: String,
    required: [true, 'Please add a class'],
    trim: true
  },
  academicYear: {
    type: String,
    required: [true, 'Please add academic year']
  },
  date: {
    type: Date,
    required: [true, 'Please add exam date']
  },
  startTime: {
    type: String,
    required: [true, 'Please add start time']
  },
  endTime: {
    type: String,
    trim: true
  },
  duration: {
    type: Number,
    required: [true, 'Please add duration'],
    min: 1
  },
  totalMarks: {
    type: Number,
    required: [true, 'Please add total marks'],
    min: 1
  },
  passingMarks: {
    type: Number,
    required: [true, 'Please add passing marks'],
    min: 1
  },
  roomNumber: {
    type: String,
    trim: true
  },
  instructions: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['Scheduled', 'Ongoing', 'Completed', 'Cancelled', 'Postponed'],
    default: 'Scheduled'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Pre-save hook to auto-generate examId
examSchema.pre('save', async function(next) {
  if (this.isNew || !this.examId) {
    let nextSequenceNumber = 1;
    const lastExam = await this.constructor.findOne()
      .sort({ examId: -1 })
      .select('examId')
      .lean();

    if (lastExam && lastExam.examId) {
      const match = lastExam.examId.match(/EXM-(\d+)$/);
      if (match) {
        nextSequenceNumber = parseInt(match[1], 10) + 1;
      }
    }
    this.examId = `EXM-${nextSequenceNumber.toString().padStart(6, '0')}`;
  }
  next();
});

// Virtual field for student count (students enrolled in the class)
examSchema.virtual('studentCount').get(async function() {
  const Student = mongoose.model('Student');
  const count = await Student.countDocuments({ 
    class: this.class,
    isActive: true 
  });
  return count;
});

// Indexes for faster queries
examSchema.index({ examId: 1 });
examSchema.index({ class: 1 });
examSchema.index({ subject: 1 });
examSchema.index({ academicYear: 1 });
examSchema.index({ date: 1 });
examSchema.index({ isActive: 1 });
examSchema.index({ status: 1 });
examSchema.index({ examType: 1 });

const Exam = mongoose.model('Exam', examSchema);

module.exports = Exam; 