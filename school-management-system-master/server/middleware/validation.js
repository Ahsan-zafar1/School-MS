const validateAttendance = (req, res, next) => {
  const { status, date, class: className, records } = req.body;

  // For single record updates
  if (status && !['present', 'absent', 'late'].includes(status)) {
    return res.status(400).json({ 
      message: 'Invalid attendance status. Must be present, absent, or late' 
    });
  }

  // For bulk attendance marking
  if (req.path === '/mark') {
    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    if (!className) {
      return res.status(400).json({ message: 'Class is required' });
    }

    if (!records || !Array.isArray(records)) {
      return res.status(400).json({ message: 'Records must be an array' });
    }

    // Validate each record in the array
    for (const record of records) {
      if (!record.studentId) {
        return res.status(400).json({ message: 'Student ID is required for each record' });
      }
      if (!record.status || !['present', 'absent', 'late'].includes(record.status)) {
        return res.status(400).json({ 
          message: 'Invalid status in records. Must be present, absent, or late' 
        });
      }
    }
  }

  next();
};

module.exports = {
  validateAttendance
}; 