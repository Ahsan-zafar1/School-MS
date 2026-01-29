# Drop Old Attendance Index

## Issue
The error `E11000 duplicate key error collection: school-management.attendances index: date_1_student_1` occurs because there's an old index that doesn't have the proper partial filter expression. This old index applies to all records (both students and teachers), causing conflicts when multiple teachers are marked on the same date.

## Quick Fix (Recommended)

### Option 1: Run the Automated Script
```bash
cd server
node scripts/dropOldAttendanceIndex.js
```

This script will:
- Connect to your MongoDB database
- List all current indexes
- Drop the problematic `date_1_student_1` index
- Show you the remaining indexes
- Verify the cleanup was successful

### Option 2: Manual MongoDB Command

1. Connect to your MongoDB database:
```bash
mongosh "your-mongodb-connection-string"
```

2. Switch to your database:
```javascript
use school-management
```

3. Drop the old index:
```javascript
db.attendances.dropIndex("date_1_student_1")
```

4. Verify the indexes:
```javascript
db.attendances.getIndexes()
```

You should see:
- `date_student_unique` (with partialFilterExpression for type: 'student')
- `date_teacher_unique` (with partialFilterExpression for type: 'teacher')

5. Restart your Node.js server to ensure new indexes are created properly.

## Alternative: Drop All Indexes and Recreate
If you want to start fresh:
```javascript
db.attendances.dropIndexes()
```
Then restart your Node.js server to recreate all indexes with the correct configuration.

## Why This Happens
The old index `date_1_student_1` was created without a partial filter expression, meaning it applies to ALL attendance records. When marking teacher attendance:
- Multiple teachers on the same date all have `student: null`
- The old index sees this as duplicate keys: `{ date: same_date, student: null }`
- This causes the E11000 duplicate key error

The new indexes have partial filter expressions that only apply to their respective types:
- `date_student_unique` only applies when `type: 'student'` AND `student` exists
- `date_teacher_unique` only applies when `type: 'teacher'` AND `teacher` exists

This prevents conflicts between student and teacher attendance records.

