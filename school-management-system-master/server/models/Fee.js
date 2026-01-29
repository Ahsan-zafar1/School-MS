const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema({
  feeId: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Please select a student']
  },
  class: {
    type: String,
    trim: true
  },
  academicYear: {
    type: String,
    trim: true
  },
  amount: {
    type: Number,
    required: [true, 'Please add fee amount'],
    min: [0, 'Amount cannot be negative']
  },
  currency: {
    type: String,
    required: [true, 'Please select a currency'],
    enum: ['PKR', 'USD', 'EUR', 'GBP', 'INR', 'AED', 'SAR', 'CAD', 'AUD', 'JPY'],
    default: 'PKR'
  },
  feeType: {
    type: String,
    required: [true, 'Please specify fee type'],
    enum: ['Tuition', 'Library', 'Laboratory', 'Sports', 'Examination', 'Transport', 'Hostel', 'Other']
  },
  month: {
    type: String,
    required: [true, 'Please specify the month'],
    set: function(val) {
      // Extract month and year from dueDate and format as "YYYY-MM"
      if (this.dueDate) {
        const date = new Date(this.dueDate);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
      return val;
    }
  },
  dueDate: {
    type: Date,
    required: [true, 'Please add due date']
  },
  status: {
    type: String,
    required: true,
    enum: ['Paid', 'Pending', 'Overdue', 'Partial', 'Waived'],
    default: 'Pending'
  },
  paymentDate: {
    type: Date
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Bank Transfer', 'Credit Card', 'Debit Card', 'Cheque', 'Online Payment', 'Other']
  },
  transactionId: {
    type: String,
    trim: true
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: [0, 'Paid amount cannot be negative']
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative']
  },
  description: {
    type: String,
    trim: true
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
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook to auto-generate feeId
feeSchema.pre('save', async function(next) {
  // Generate unique fee ID
  if (this.isNew || !this.feeId) {
    let isUnique = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 10;
    
    while (!isUnique && attempts < MAX_ATTEMPTS) {
      try {
        const Fee = mongoose.model('Fee');
        let nextSequenceNumber = 1;
        
        const lastFee = await Fee.findOne()
          .sort({ feeId: -1 })
          .select('feeId')
          .lean();
        
        if (lastFee && lastFee.feeId) {
          const match = lastFee.feeId.match(/FEE-(\d+)$/);
          if (match) {
            nextSequenceNumber = parseInt(match[1], 10) + 1;
          }
        }
        
        this.feeId = `FEE-${nextSequenceNumber.toString().padStart(6, '0')}`;
        
        const existing = await Fee.findOne({ feeId: this.feeId });
        if (!existing || existing._id.toString() === this._id.toString()) {
          isUnique = true;
        } else {
          nextSequenceNumber++;
          attempts++;
        }
      } catch (error) {
        console.error('Error generating feeId:', error);
        this.feeId = `FEE-${Date.now().toString().slice(-6)}`;
        isUnique = true;
      }
    }
    
    if (!isUnique) {
      this.feeId = `FEE-${Date.now().toString().slice(-6)}`;
    }
  }
  
  // Update the updatedAt timestamp and set month before saving
  this.updatedAt = Date.now();
  
  // Set month based on dueDate
  if (this.dueDate) {
    const date = new Date(this.dueDate);
    this.month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
  
  // Only auto-update status if it hasn't been explicitly modified by the user
  // Check if status was modified in this save operation
  const statusWasModified = this.isModified('status');
  
  // Auto-update status based on due date (only if status wasn't manually changed)
  if (!statusWasModified && this.status === 'Pending' && this.dueDate && new Date(this.dueDate) < new Date()) {
    this.status = 'Overdue';
  }
  
  // Auto-update status based on paidAmount (only if status wasn't manually changed)
  // This allows users to manually set status (e.g., mark as "Pending" even if paidAmount > 0)
  if (!statusWasModified) {
    // If paidAmount equals amount, mark as Paid
    if (this.paidAmount >= this.amount && this.amount > 0) {
      this.status = 'Paid';
      if (!this.paymentDate) {
        this.paymentDate = new Date();
      }
    } else if (this.paidAmount > 0 && this.paidAmount < this.amount) {
      this.status = 'Partial';
    }
  }
  
  next();
});

// Add compound unique index for student, feeType, and month
feeSchema.index({ student: 1, feeType: 1, month: 1 }, { unique: true });
feeSchema.index({ feeId: 1 });
feeSchema.index({ student: 1 });
feeSchema.index({ class: 1 });
feeSchema.index({ status: 1 });
feeSchema.index({ feeType: 1 });
feeSchema.index({ dueDate: 1 });

module.exports = mongoose.model('Fee', feeSchema); 