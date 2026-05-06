const mongoose = require('mongoose');

const studentEnrollmentHistorySchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ['create', 'class_change', 'bulk_assign', 'promotion'],
      required: true,
    },
    fromClass: {
      type: String,
      trim: true,
    },
    toClass: {
      type: String,
      required: true,
      trim: true,
    },
    fromAcademicYear: {
      type: String,
      trim: true,
    },
    toAcademicYear: {
      type: String,
      trim: true,
    },
    note: {
      type: String,
      trim: true,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    changedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

studentEnrollmentHistorySchema.index({ student: 1, changedAt: -1 });
studentEnrollmentHistorySchema.index({ toAcademicYear: 1, toClass: 1 });

module.exports = mongoose.model('StudentEnrollmentHistory', studentEnrollmentHistorySchema);
