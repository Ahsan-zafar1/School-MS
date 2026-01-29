const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  // School Information
  schoolInfo: {
    name: {
      type: String,
      default: 'School Management System'
    },
    shortName: {
      type: String,
      default: 'SMS'
    },
    address: {
      type: String,
      default: ''
    },
    city: {
      type: String,
      default: ''
    },
    state: {
      type: String,
      default: ''
    },
    zipCode: {
      type: String,
      default: ''
    },
    country: {
      type: String,
      default: ''
    },
    phone: {
      type: String,
      default: ''
    },
    email: {
      type: String,
      default: ''
    },
    website: {
      type: String,
      default: ''
    },
    logo: {
      type: String,
      default: ''
    },
    principalName: {
      type: String,
      default: ''
    },
    principalEmail: {
      type: String,
      default: ''
    },
    principalPhone: {
      type: String,
      default: ''
    }
  },

  // Academic Settings
  academicSettings: {
    defaultAcademicYear: {
      type: String,
      default: ''
    },
    terms: {
      type: [String],
      default: ['1st Term', '2nd Term', '3rd Term', 'Final Term']
    },
    gradingSystem: {
      type: String,
      enum: ['Percentage', 'Letter Grade', 'GPA'],
      default: 'Percentage'
    },
    passingPercentage: {
      type: Number,
      default: 50,
      min: 0,
      max: 100
    },
    gradeScale: {
      type: [{
        grade: String,
        minPercentage: Number,
        maxPercentage: Number,
        gpa: Number
      }],
      default: [
        { grade: 'A+', minPercentage: 90, maxPercentage: 100, gpa: 4.0 },
        { grade: 'A', minPercentage: 80, maxPercentage: 89, gpa: 3.5 },
        { grade: 'B', minPercentage: 70, maxPercentage: 79, gpa: 3.0 },
        { grade: 'C', minPercentage: 60, maxPercentage: 69, gpa: 2.5 },
        { grade: 'D', minPercentage: 50, maxPercentage: 59, gpa: 2.0 },
        { grade: 'F', minPercentage: 0, maxPercentage: 49, gpa: 0.0 }
      ]
    },
    attendancePercentage: {
      type: Number,
      default: 75,
      min: 0,
      max: 100
    }
  },

  // System Settings
  systemSettings: {
    timezone: {
      type: String,
      default: 'UTC'
    },
    dateFormat: {
      type: String,
      enum: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'],
      default: 'DD/MM/YYYY'
    },
    timeFormat: {
      type: String,
      enum: ['12h', '24h'],
      default: '12h'
    },
    currency: {
      type: String,
      default: 'USD'
    },
    currencySymbol: {
      type: String,
      default: '$'
    },
    language: {
      type: String,
      default: 'en'
    },
    itemsPerPage: {
      type: Number,
      default: 10,
      min: 5,
      max: 100
    },
    enableNotifications: {
      type: Boolean,
      default: true
    },
    enableEmailNotifications: {
      type: Boolean,
      default: true
    },
    enableSMSNotifications: {
      type: Boolean,
      default: false
    }
  },

  // Email Settings
  emailSettings: {
    smtpHost: {
      type: String,
      default: ''
    },
    smtpPort: {
      type: Number,
      default: 587
    },
    smtpUser: {
      type: String,
      default: ''
    },
    smtpPassword: {
      type: String,
      default: ''
    },
    smtpSecure: {
      type: Boolean,
      default: true
    },
    fromEmail: {
      type: String,
      default: ''
    },
    fromName: {
      type: String,
      default: 'School Management System'
    }
  },

  // SMS Settings
  smsSettings: {
    provider: {
      type: String,
      enum: ['Twilio', 'AWS SNS', 'Custom'],
      default: 'Twilio'
    },
    apiKey: {
      type: String,
      default: ''
    },
    apiSecret: {
      type: String,
      default: ''
    },
    fromNumber: {
      type: String,
      default: ''
    }
  },

  // Backup Settings
  backupSettings: {
    autoBackup: {
      type: Boolean,
      default: false
    },
    backupFrequency: {
      type: String,
      enum: ['Daily', 'Weekly', 'Monthly'],
      default: 'Daily'
    },
    backupRetention: {
      type: Number,
      default: 30, // days
      min: 1,
      max: 365
    },
    lastBackup: {
      type: Date
    }
  },

  // Feature Toggles
  features: {
    enableStudentPortal: {
      type: Boolean,
      default: false
    },
    enableParentPortal: {
      type: Boolean,
      default: false
    },
    enableTeacherPortal: {
      type: Boolean,
      default: true
    },
    enableOnlinePayment: {
      type: Boolean,
      default: false
    },
    enableIDCardGeneration: {
      type: Boolean,
      default: true
    },
    enableReportCardGeneration: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
settingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;
