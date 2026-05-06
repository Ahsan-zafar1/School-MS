const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  phone: {
    type: String,
    required: [true, 'Please add a phone number']
  },
  class: {
    type: String,
    required: [true, 'Please add a class']
  },
  classRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    index: true
  },
  section: {
    type: String,
    trim: true,
    index: true
  },
  address: {
    type: String,
    required: [true, 'Please add an address']
  },
  studentId: {
    type: String,
    unique: true,
    index: true
  },
  rollNumber: {
    type: String,
    unique: true
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other']
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  admissionDate: {
    type: Date
  },
  previousSchool: {
    type: String
  },
  fatherName: {
    type: String
  },
  fatherOccupation: {
    type: String
  },
  fatherPhone: {
    type: String
  },
  motherName: {
    type: String
  },
  motherOccupation: {
    type: String
  },
  motherPhone: {
    type: String
  },
  guardianName: {
    type: String
  },
  guardianRelation: {
    type: String
  },
  guardianPhone: {
    type: String
  },
  parentName: {
    type: String
  },
  parentPhone: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  photo: {
    type: String  // This will store the URL/path to the photo
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook to generate studentId and ensure rollNumber format is CLASS-XXX
studentSchema.pre('save', async function(next) {
  // Generate unique student ID for students without one (new students or existing without ID)
  if (!this.studentId) {
    // Find the highest student ID
    const lastStudent = await this.constructor.findOne()
      .sort({ studentId: -1 })
      .select('studentId')
      .lean();
    
    let nextSequenceNumber = 1;
    
    if (lastStudent && lastStudent.studentId) {
      // Extract number from format STU-XXX
      const match = lastStudent.studentId.match(/STU-(\d+)$/);
      if (match) {
        const sequenceNum = parseInt(match[1], 10);
        nextSequenceNumber = sequenceNum + 1;
      }
    }
    
    // Format: STU-XXX (e.g., STU-000001, STU-000002)
    this.studentId = `STU-${nextSequenceNumber.toString().padStart(6, '0')}`;
    console.log(`[PRE-SAVE HOOK] Generated student ID: ${this.studentId}${this.isNew ? ' (new student)' : ' (existing student without ID)'}`);
  }
  
  // Handle roll number generation/validation
  if (this.class) {
    // Check if rollNumber matches the class-based format
    const escapedClassName = this.class.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const classBasedPattern = new RegExp(`^${escapedClassName}-\\d+$`);
    
    // Check if this is a class change (for updates)
    let classChanged = false;
    if (!this.isNew && this.isModified('class')) {
      classChanged = true;
      console.log(`[PRE-SAVE HOOK] Class changed, will regenerate roll number if needed`);
    }
    
    // If rollNumber doesn't exist, doesn't match format, or class changed, regenerate it
    if (!this.rollNumber || !classBasedPattern.test(this.rollNumber) || classChanged) {
      console.log(`[PRE-SAVE HOOK] Roll number ${this.rollNumber || '(empty)'} does not match class format ${this.class}-XXX. Regenerating...`);
      
      // Find all students in the same class to get the max sequence number
      // Exclude current student if this is an update
      const query = { class: this.class };
      if (!this.isNew && this._id) {
        query._id = { $ne: this._id };
      }
      
      const studentsInClass = await this.constructor.find(query)
        .select('rollNumber')
        .lean();
      
      let maxSequenceNumber = 0;
      studentsInClass.forEach(student => {
        if (student.rollNumber) {
          const pattern = new RegExp(`^${escapedClassName}-(\\d+)$`);
          const match = student.rollNumber.match(pattern);
          if (match) {
            const sequenceNum = parseInt(match[1], 10);
            if (sequenceNum > maxSequenceNumber) {
              maxSequenceNumber = sequenceNum;
            }
          }
        }
      });
      
      const nextSequenceNumber = maxSequenceNumber + 1;
      this.rollNumber = `${this.class}-${nextSequenceNumber.toString().padStart(3, '0')}`;
      console.log(`[PRE-SAVE HOOK] Regenerated roll number: ${this.rollNumber} (max was: ${maxSequenceNumber})`);
    } else {
      console.log(`[PRE-SAVE HOOK] Roll number ${this.rollNumber} is valid for class ${this.class}`);
    }
  }
  next();
});

module.exports = mongoose.model('Student', studentSchema); 