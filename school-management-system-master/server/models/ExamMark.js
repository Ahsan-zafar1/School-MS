const mongoose = require('mongoose');

const examMarkSchema = new mongoose.Schema({
  resultId: {
    type: String,
    unique: true,
    sparse: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: false
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  class: {
    type: String,
    required: true,
    trim: true
  },
  term: {
    type: String,
    enum: ['1st Term', '2nd Term', '3rd Term', 'Final Term'],
    required: true
  },
  academicYear: {
    type: String,
    required: true,
    trim: true
  },
  marksObtained: {
    type: Number,
    required: true,
    min: 0
  },
  totalMarks: {
    type: Number,
    required: true,
    min: 1
  },
  passingPercentage: {
    type: Number,
    default: 50,
    min: 0,
    max: 100
  },
  percentage: {
    type: Number,
    default: 0
  },
  grade: {
    type: String,
    required: false,
    enum: ['A+', 'A', 'B', 'C', 'D', 'F'],
    default: 'F'
  },
  position: {
    type: Number,
    default: null
  },
  status: {
    type: String,
    enum: ['Pass', 'Fail', 'Pending'],
    default: 'Pending'
  },
  remarks: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Add indexes for performance
examMarkSchema.index({ student: 1, subject: 1, term: 1, academicYear: 1 });
examMarkSchema.index({ class: 1, term: 1, academicYear: 1 });
examMarkSchema.index({ exam: 1 });
examMarkSchema.index({ resultId: 1 });
examMarkSchema.index({ isActive: 1 });

// Auto-generate resultId
examMarkSchema.pre('save', async function(next) {
  if (this.isNew || !this.resultId) {
    try {
      const ExamMark = mongoose.model('ExamMark');
      let nextSequenceNumber = 1;
      let attempts = 0;
      const maxAttempts = 10;
      let isUnique = false;
      
      // Find the last result by sorting by resultId descending
      const lastResult = await ExamMark.findOne()
        .sort({ resultId: -1 })
        .select('resultId')
        .lean();

      if (lastResult && lastResult.resultId) {
        // Extract the number from the resultId (e.g., "RES-000007" -> 7)
        const match = lastResult.resultId.match(/RES-(\d+)$/);
        if (match) {
          nextSequenceNumber = parseInt(match[1], 10) + 1;
        }
      }

      // Keep trying until we find a unique resultId (handle race conditions)
      while (!isUnique && attempts < maxAttempts) {
        this.resultId = `RES-${nextSequenceNumber.toString().padStart(6, '0')}`;
        
        // Check if this resultId already exists
        const existing = await ExamMark.findOne({ resultId: this.resultId });
        if (!existing || existing._id.toString() === this._id.toString()) {
          isUnique = true;
        } else {
          // If duplicate found, increment and try again
          nextSequenceNumber++;
          attempts++;
        }
      }

      // If we couldn't find a unique ID after max attempts, use timestamp fallback
      if (!isUnique) {
        this.resultId = `RES-${Date.now().toString().slice(-6)}`;
      }
    } catch (error) {
      console.error('Error generating resultId:', error);
      // If error occurs, fallback to timestamp-based ID
      this.resultId = `RES-${Date.now().toString().slice(-6)}`;
    }
  }
  next();
});

// Calculate percentage, grade, and status based on marks obtained
examMarkSchema.pre('save', async function(next) {
  try {
    // Ensure marksObtained and totalMarks are numbers
    const marksObtained = Number(this.marksObtained) || 0;
    const totalMarks = Number(this.totalMarks) || 100;
    
    // Always calculate percentage
    this.percentage = totalMarks > 0 ? (marksObtained / totalMarks) * 100 : 0;
    
    // If passingPercentage is not set and exam is linked, try to get it from exam
    if ((!this.passingPercentage || this.passingPercentage === 50) && this.exam) {
      try {
        const Exam = mongoose.model('Exam');
        const exam = await Exam.findById(this.exam);
        if (exam && exam.passingMarks && exam.totalMarks) {
          // Calculate passing percentage from exam's passingMarks
          this.passingPercentage = (exam.passingMarks / exam.totalMarks) * 100;
        }
      } catch (err) {
        // If exam not found or error, use default
        this.passingPercentage = this.passingPercentage || 50;
      }
    }
    
    // Ensure passingPercentage has a value (default to 50 if not set)
    const passingPercentage = Number(this.passingPercentage) || 50;
    
    // Always calculate grade based on percentage
    if (this.percentage >= 90) {
      this.grade = 'A+';
    } else if (this.percentage >= 80) {
      this.grade = 'A';
    } else if (this.percentage >= 70) {
      this.grade = 'B';
    } else if (this.percentage >= 60) {
      this.grade = 'C';
    } else if (this.percentage >= 50) {
      this.grade = 'D';
    } else {
      this.grade = 'F';
    }
    
    // Calculate status:
    // - If grade is F, status is ALWAYS Fail (regardless of passing percentage)
    // - Otherwise, use configurable passing percentage to determine Pass/Fail
    // - Also check: if marks obtained is below passing marks threshold, status is Fail
    if (this.grade === 'F') {
      // Grade F always means Fail
      this.status = 'Fail';
    } else {
      // For grades A+, A, B, C, D: use passing percentage
      const passingMarks = (totalMarks * passingPercentage) / 100;
      if (marksObtained < passingMarks) {
        this.status = 'Fail';
      } else {
        this.status = 'Pass';
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('ExamMark', examMarkSchema); 