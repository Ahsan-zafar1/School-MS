# School Management System - Quick Reference Guide

**For Developers** - Quick lookup for common patterns and functions

---

## 🚀 Quick Start

### **Run Backend:**
```bash
cd server
npm install
npm start
# Server runs on http://localhost:9999
```

### **Run Frontend:**
```bash
cd client
npm install
npm start
# App runs on http://localhost:3000
```

### **Default Admin:**
- Email: `admin@school.com`
- Password: `admin123`

---

## 📦 Module Quick Reference

### **1. Students Module**

**Model:** `server/models/Student.js`  
**Routes:** `server/routes/studentRoutes.js`  
**Frontend:** `client/src/pages/Students.tsx`

**Key Features:**
- Auto-generates `STU-000001` tracking ID
- Auto-generates `CLASS-XXX` roll numbers
- Photo upload support
- ID card generation with QR code

**API Endpoints:**
```
GET    /api/students              # List with pagination/filters
GET    /api/students/:id          # Get single student
POST   /api/students              # Create student
PUT    /api/students/:id          # Update student
DELETE /api/students/:id          # Delete student
POST   /api/students/bulk-update  # Bulk activate/deactivate/assign class
POST   /api/students/bulk-delete  # Bulk delete
GET    /api/students/export       # Export CSV/Excel
POST   /api/students/import       # Import CSV/Excel
GET    /api/students/:id/id-card  # Generate ID card PDF
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `sortBy` - Column to sort (default: 'createdAt')
- `sortOrder` - 'asc' or 'desc' (default: 'desc')
- `search` - Search term (searches name, email, rollNumber, studentId)
- `class` - Filter by class
- `trackingId` - Filter by tracking ID
- `isActive` - Filter by status ('true' or 'false')

---

### **2. Teachers Module**

**Model:** `server/models/Teacher.js`  
**Routes:** `server/routes/teacherRoutes.js`  
**Frontend:** `client/src/pages/Teachers.tsx`

**Key Features:**
- Auto-generates `TCH-000001` tracking ID
- Photo upload support
- ID card generation with QR code
- Subject and qualification tracking

**API Endpoints:**
```
GET    /api/teachers              # List with pagination/filters
GET    /api/teachers/:id          # Get single teacher
POST   /api/teachers              # Create teacher
PUT    /api/teachers/:id          # Update teacher
DELETE /api/teachers/:id          # Delete teacher
POST   /api/teachers/bulk-update  # Bulk activate/deactivate
POST   /api/teachers/bulk-delete  # Bulk delete
GET    /api/teachers/export       # Export CSV/Excel
POST   /api/teachers/import       # Import CSV/Excel
GET    /api/teachers/:id/id-card  # Generate ID card PDF
```

**Query Parameters:**
- Same pagination/sorting as Students
- `search` - Searches name, email, teacherId, subject, qualification
- `subject` - Filter by subject
- `trackingId` - Filter by tracking ID
- `gender` - Filter by gender
- `isActive` - Filter by status

---

### **3. Classes Module**

**Model:** `server/models/Class.js`  
**Routes:** `server/routes/classRoutes.js`  
**Frontend:** `client/src/pages/Classes.tsx`

**Key Features:**
- Auto-generates `CLS-000001` tracking ID
- Dynamic student count (calculated from Student collection)
- Class teacher assignment
- Weekly schedule support
- Grid and Table view modes

**API Endpoints:**
```
GET    /api/classes              # List with pagination/filters
GET    /api/classes/:id          # Get single class
POST   /api/classes              # Create class
PUT    /api/classes/:id          # Update class
DELETE /api/classes/:id          # Delete class
POST   /api/classes/bulk-update  # Bulk activate/deactivate
POST   /api/classes/bulk-delete  # Bulk delete
GET    /api/classes/export       # Export CSV/Excel
POST   /api/classes/import       # Import CSV/Excel
POST   /api/classes/:id/students # Add students to class
```

**Query Parameters:**
- `search` - Searches name, section, classId, roomNumber
- `grade` - Filter by grade (handles custom classes like "KG")
- `status` - Filter by status
- `academicYear` - Filter by academic year
- `capacityMin`, `capacityMax` - Capacity range
- `teacher` - Filter by class teacher

**Special Logic:**
- Grade filter uses `$or` to match by `grade` field or class `name`
- Student count calculated dynamically: `Student.countDocuments({ class: className, isActive: true })`

---

### **4. Exams Module**

**Model:** `server/models/Exam.js`  
**Routes:** `server/routes/examRoutes.js`  
**Frontend:** `client/src/pages/Exams.tsx`

**Key Features:**
- Auto-generates `EXM-000001` tracking ID
- Exam types: Midterm, Final, Quiz, Assignment, Project, Practical, Oral, Other
- Status: Scheduled, Ongoing, Completed, Cancelled, Postponed
- Calendar view for exam schedules
- Date sheet printing

**API Endpoints:**
```
GET    /api/exams              # List with pagination/filters
GET    /api/exams/:id          # Get single exam
POST   /api/exams              # Create exam
PUT    /api/exams/:id          # Update exam
DELETE /api/exams/:id          # Delete exam
POST   /api/exams/bulk-update  # Bulk activate/deactivate
POST   /api/exams/bulk-delete  # Bulk delete
GET    /api/exams/export       # Export CSV/Excel
POST   /api/exams/import       # Import CSV/Excel
```

**Query Parameters:**
- `search` - Searches examName, subject, class, examId, roomNumber
- `class` - Filter by class
- `subject` - Filter by subject
- `examType` - Filter by exam type
- `status` - Filter by status
- `academicYear` - Filter by academic year
- `dateFrom`, `dateTo` - Date range filter
- `isActive` - Filter by active status

**Special Features:**
- Calendar view component
- Date sheet printing (individual and bulk)
- View mode toggle (Table/Calendar)

---

### **5. Results Module**

**Model:** `server/models/ExamMark.js`  
**Routes:** `server/routes/examMarkRoutes.js`  
**Frontend:** `client/src/pages/Results.tsx`

**Key Features:**
- Auto-generates `RES-000001` tracking ID
- **Configurable passing percentage** (default 50%, user can set)
- Auto-calculates: percentage, grade, status
- **Grade F = Always Fail** (regardless of passing percentage)
- Report card generation
- Statistics dashboard

**API Endpoints:**
```
GET    /api/exam-marks                    # List with pagination/filters
GET    /api/exam-marks/:id                # Get single result
POST   /api/exam-marks/create             # Create result
PUT    /api/exam-marks/:id                # Update result
DELETE /api/exam-marks/:id                # Delete result
POST   /api/exam-marks/bulk-update        # Bulk activate/deactivate
POST   /api/exam-marks/bulk-delete        # Bulk delete
GET    /api/exam-marks/export             # Export CSV/Excel
POST   /api/exam-marks/import             # Import CSV/Excel
GET    /api/exam-marks/report/:studentId/:year  # Generate report card
GET    /api/exam-marks/stats/overview     # Get statistics
```

**Query Parameters:**
- `search` - Searches subject, class, resultId, term, academicYear, grade
- `class` - Filter by class
- `subject` - Filter by subject
- `term` - Filter by term (1st Term, 2nd Term, 3rd Term, Final Term)
- `academicYear` - Filter by academic year
- `grade` - Filter by grade (A+, A, B, C, D, F)
- `status` - Filter by status (Pass, Fail, Pending)
- `isActive` - Filter by active status
- `studentId` - Filter by student
- `examId` - Filter by exam

**Grade Calculation:**
```
A+ : >= 90%
A  : >= 80%
B  : >= 70%
C  : >= 60%
D  : >= 50%
F  : < 50%
```

**Status Calculation:**
```
if (grade === 'F') {
  status = 'Fail'  // Always fail for F grade
} else {
  passingMarks = (totalMarks * passingPercentage) / 100
  status = marksObtained >= passingMarks ? 'Pass' : 'Fail'
}
```

**Special Features:**
- Passing percentage input field (user can set custom threshold)
- Statistics dashboard (pass rate, average, grade distribution)
- Report card generation (multi-term with overall summary)
- Status recalculation on fetch (ensures consistency)

---

## 🔧 Common Code Patterns

### **1. Fetch with Pagination & Filters**

**Frontend:**
```typescript
const fetchItems = async () => {
  const params = new URLSearchParams({
    page: currentPage.toString(),
    limit: itemsPerPage.toString(),
    sortBy: sortBy,
    sortOrder: sortOrder,
  });
  
  if (searchTerm) params.append('search', searchTerm);
  if (filterClass) params.append('class', filterClass);
  
  const response = await api.get(`/api/items?${params.toString()}`);
  setItems(response.data.data || []);
  setTotalPages(response.data.pagination.totalPages);
};
```

**Backend:**
```javascript
const page = parseInt(req.query.page) || 1;
const limit = parseInt(req.query.limit) || 10;
const skip = (page - 1) * limit;

const total = await Model.countDocuments(filter);
const data = await Model.find(filter)
  .sort(sort)
  .skip(skip)
  .limit(limit)
  .lean();

res.json({
  success: true,
  data,
  pagination: { currentPage: page, totalPages: Math.ceil(total / limit), totalItems: total }
});
```

### **2. Form Handling with react-hook-form**

```typescript
const { register, handleSubmit, reset, formState: { errors } } = useForm();

const onSubmit = async (data) => {
  await api.post('/api/items', data);
  reset();
  setShowModal(false);
};

<form onSubmit={handleSubmit(onSubmit)}>
  <input {...register('name', { required: 'Name is required' })} />
  {errors.name && <p>{errors.name.message}</p>}
</form>
```

### **3. Bulk Actions**

```typescript
const [selectedItems, setSelectedItems] = useState<string[]>([]);

const handleBulkDelete = async () => {
  await api.post('/api/items/bulk-delete', { ids: selectedItems });
  fetchItems();
  setSelectedItems([]);
};
```

### **4. Export/Import**

**Export:**
```typescript
const handleExport = async (format: 'csv' | 'excel') => {
  const response = await api.get(`/api/items/export?format=${format}`, {
    responseType: 'blob'
  });
  const blob = new Blob([response.data]);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `items.${format === 'excel' ? 'xlsx' : 'csv'}`;
  link.click();
};
```

**Import:**
```typescript
const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  const formData = new FormData();
  formData.append('file', file);
  await api.post('/api/items/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};
```

### **5. Dynamic Class Dropdown**

```typescript
import { useClasses } from '../hooks/useClasses';

const { classNames } = useClasses({ activeOnly: false });

<select>
  <option value="">Select class</option>
  {classNames.map((className) => (
    <option key={className} value={className}>{className}</option>
  ))}
</select>
```

---

## 🎯 Key Functions Reference

### **Backend Functions**

**ID Generation:**
```javascript
// Pattern used in all models
schema.pre('save', async function(next) {
  if (this.isNew || !this.trackingId) {
    const lastDoc = await this.constructor.findOne()
      .sort({ trackingId: -1 })
      .select('trackingId')
      .lean();
    // Extract number, increment, generate
  }
});
```

**Student Count Calculation:**
```javascript
// For Classes and Exams
const studentCount = await Student.countDocuments({
  class: className,
  isActive: true
});
```

**Status Recalculation (Results):**
```javascript
// On fetch, recalculate for consistency
const processedResults = results.map(result => {
  // Recalculate percentage, grade, status
  return { ...result, percentage, grade, status };
});
```

### **Frontend Functions**

**Sort Handler:**
```typescript
const handleSort = (column: string) => {
  if (sortBy === column) {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  } else {
    setSortBy(column);
    setSortOrder('asc');
  }
  setCurrentPage(1);
};
```

**Page Change:**
```typescript
const handlePageChange = (newPage: number) => {
  setCurrentPage(newPage);
  setSelectedItems([]); // Clear selection
};
```

**Print Profile:**
```typescript
const handlePrintProfile = (item: Item) => {
  const printWindow = window.open('', '_blank');
  const printContent = `<!DOCTYPE html>...`;
  printWindow.document.write(printContent);
  printWindow.document.close();
  printWindow.print();
};
```

---

## 🔍 Common Issues & Fixes

### **Issue: Duplicate Key Error**
**Fix:** Use retry loop in ID generation with duplicate checking

### **Issue: Route Not Found (404)**
**Fix:** Ensure specific routes (like `/export`) come before parameter routes (like `/:id`)

### **Issue: Form Not Pre-filling**
**Fix:** Use `reset()` with explicit field values, handle undefined/null

### **Issue: Date Timezone Shift**
**Fix:** Use local date components (`getFullYear()`, `getMonth()`, `getDate()`) instead of `toISOString()`

### **Issue: Status Not Updating**
**Fix:** Recalculate status on fetch, ensure pre-save hook runs

---

## 📚 File Locations

### **Backend:**
- Models: `server/models/`
- Routes: `server/routes/`
- Middleware: `server/middleware/`
- Uploads: `server/uploads/`

### **Frontend:**
- Pages: `client/src/pages/`
- Components: `client/src/components/`
- Hooks: `client/src/hooks/`
- Contexts: `client/src/contexts/`
- Utils: `client/src/utils/`

### **Documentation:**
- `SYSTEM_FUNCTIONALITY_REVIEW.md` - Detailed feature review
- `COMPREHENSIVE_SYSTEM_REVIEW.md` - Complete system architecture
- `QUICK_REFERENCE_GUIDE.md` - This file

---

## 🎨 UI Components

### **Common Components:**
- **Layout:** Sidebar navigation, header, main content area
- **Modal:** Form modals for add/edit
- **Preview Modal:** Detailed view with print
- **Table:** Sortable, paginated data table
- **Filters:** Search bar, dropdown filters
- **Bulk Actions:** Selection toolbar

### **Color Coding:**
- **Status Badges:**
  - Active/Pass: Green (`bg-green-100 text-green-800`)
  - Inactive/Fail: Red (`bg-red-100 text-red-800`)
  - Pending: Yellow (`bg-yellow-100 text-yellow-800`)
  
- **Grade Badges:**
  - A+: Green
  - A: Blue
  - B: Indigo
  - C: Yellow
  - D: Orange
  - F: Red

---

## 🔐 Authentication

**Login:**
```typescript
const { login } = useAuth();
await login(email, password);
// Token stored in localStorage
```

**Protected Routes:**
```typescript
<PrivateRoute>
  <Component />
</PrivateRoute>
```

**API Calls:**
- Token automatically added via Axios interceptor
- Auto-logout on 401 response

---

## 📊 Data Models Summary

### **Student:**
- `studentId` (STU-000001)
- `rollNumber` (CLASS-XXX)
- Personal info, class, parent info
- Photo, isActive

### **Teacher:**
- `teacherId` (TCH-000001)
- Personal info, subjects, qualification
- Photo, isActive

### **Class:**
- `classId` (CLS-000001)
- Name, grade, section, capacity
- Class teacher, subjects, schedule
- isActive

### **Exam:**
- `examId` (EXM-000001)
- Exam name, type, subject, class
- Date, time, marks, room
- Status, isActive

### **Result (ExamMark):**
- `resultId` (RES-000001)
- Student, exam, subject, class
- Marks, percentage, grade, status
- **passingPercentage** (configurable)
- isActive

---

**Last Updated:** 2025-01-17  
**For detailed information, see `COMPREHENSIVE_SYSTEM_REVIEW.md`**

