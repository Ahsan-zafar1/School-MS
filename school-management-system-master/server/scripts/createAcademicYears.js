const mongoose = require('mongoose');
const AcademicYear = require('../models/AcademicYear');

mongoose.connect('mongodb://localhost:27017/school_management')
  .then(async () => {
    try {
      await AcademicYear.create([
        {
          year: '2023-2024',
          startDate: '2023-09-01',
          endDate: '2024-06-30',
          isActive: true,
          createdBy: new mongoose.Types.ObjectId()
        },
        {
          year: '2024-2025',
          startDate: '2024-09-01',
          endDate: '2025-06-30',
          isActive: false,
          createdBy: new mongoose.Types.ObjectId()
        }
      ]);
      console.log('Academic years created successfully');
    } catch (error) {
      console.error('Error:', error.message);
    } finally {
      mongoose.disconnect();
    }
  }); 