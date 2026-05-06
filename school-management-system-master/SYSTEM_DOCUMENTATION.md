# School Management System – Technical Documentation

This document describes how the system works, how data is linked, and what is implemented. Use it to analyze missing functions, data linking gaps, and improvement opportunities.

---

## 1. System Overview

### 1.1 Purpose
A full-stack **School Management System** for managing students, teachers, classes, exams, results, fees, and attendance. It supports three portals: **Admin**, **Student**, and **Teacher**, with role-based access.

### 1.2 Tech Stack
| Layer    | Technology |
|----------|------------|
| Frontend | React, TypeScript, React Router, React Hook Form, Axios, Recharts, Tailwind CSS, Lucide icons, React Hot Toast |
| Backend  | Node.js, Express |
| Database | MongoDB (Mongoose) |
| Auth     | JWT (Bearer token), bcrypt for passwords |

### 1.3 Project Structure (high level)
```
school-management-system-master/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Layout, shared UI
│   │   ├── contexts/       # AuthContext, SettingsContext, ThemeContext
│   │   ├── pages/          # One page per module (Students, Teachers, etc.)
│   │   └── utils/          # api.ts (axios instance with auth)
│   └── package.json
├── server/                 # Express backend
│   ├── models/             # Mongoose schemas
│   ├── routes/             # API route handlers
│   ├── controllers/        # Some logic (e.g. settings, auth)
│   ├── middleware/         # auth.js (protect, authorize)
│   └── server.js
└── SYSTEM_DOCUMENTATION.md # This file
```

---

## 2. User Roles and Portals

### 2.1 Roles
| Role     | Description | Login links to |
|----------|-------------|-----------------|
| **admin**   | Full access: all modules, settings, user management | N/A (no Student/Teacher record) |
| **teacher**| Limited to teacher portal | **Teacher** document (matched by email) |
| **student**| Limited to student portal | **Student** document (matched by email) |
| **user**   | Default role; in practice treated like admin in nav | N/A |

### 2.2 How Login Links to Student/Teacher
- **User** (login) and **Student** / **Teacher** are **separate collections**.
- Linking is by **email**: `User.email` must equal `Student.email` or `Teacher.email`.
- There is **no** `user` field on Student or Teacher, and **no** `student`/`teacher` field on User.
- Scripts (e.g. `createAllPortalUsers.js`) create a **User** per Student/Teacher with the same email and role so they can log in and see their data.

### 2.3 Admin Portal (role = admin)
- **Routes:** `/`, `/students`, `/teachers`, `/classes`, `/exams`, `/results`, `/fees`, `/attendance`, `/reports`, `/settings`.
- **Layout:** Full sidebar with all modules.
- **Access:** All data; create/edit/delete across modules.

### 2.4 Student Portal (role = student)
- **Routes:** `/` (StudentDashboard), `/my/profile`, `/my/fees`, `/my/results`, `/my/attendance`, `/my/exams`, `/my/notifications`.
- **Layout:** Sidebar built from **Settings → Portal Permissions → Student Portal** (show/hide each item).
- **Data:** Only their own. All student data is loaded via **/api/me/** endpoints; backend finds the Student by `req.user.email` and filters by that student’s `_id`.

### 2.5 Teacher Portal (role = teacher)
- **Routes:** `/`, `/my/profile`, `/my/classes`, `/my/attendance`, `/my/exams`, `/my/notifications`.
- **Layout:** Sidebar from **Settings → Portal Permissions → Teacher Portal**.
- **Note:** Teacher “My” data is only partially implemented: `/api/me/profile` returns the Teacher document; **/api/me/fees**, **/api/me/results**, **/api/me/attendance**, **/api/me/dashboard**, **/api/me/exams** are **student-only** (403 for teachers). So teachers can see profile and nav, but not yet their own classes/attendance/exams from “me” APIs.

---

## 3. Data Models and Relationships

### 3.1 Entity Relationship Summary

```
User (login only: email, password, role)
  └── linked to Student OR Teacher by EMAIL (no FK in DB)

Student
  ├── class (string) – class name, not ObjectId to Class
  ├── referenced by: Fee.student, Attendance.student, ExamMark.student
  └── no direct ref to User or Class document

Teacher
  ├── classes[] (ObjectId ref Class) – optional
  ├── referenced by: Class.classTeacher, Class.subjects[].teacher, Attendance.teacher
  └── no direct ref to User

Class
  ├── classTeacher (ObjectId → Teacher)
  ├── students[] (ObjectId → Student)
  ├── subjects[].teacher (ObjectId → Teacher)
  └── name, section, grade, schedule, etc.

Fee
  ├── student (ObjectId → Student) ✓
  ├── class (string), academicYear (string)
  └── amount, status, feeType, month, dueDate, etc.

Attendance
  ├── student (ObjectId → Student) OR teacher (ObjectId → Teacher)
  ├── type: 'student' | 'teacher'
  ├── class (string, required when type=student), date, status
  └── status: present, absent, late, excused, half-day, unmarked

Exam
  ├── class (string), subject (string), academicYear
  └── examName, examType, date, totalMarks, etc. (no direct Student ref)

ExamMark (results)
  ├── student (ObjectId → Student) ✓
  ├── exam (ObjectId → Exam) optional
  ├── class, subject, term, academicYear
  └── marksObtained, totalMarks, grade, percentage

Settings
  └── schoolInfo, academicSettings, systemSettings, portalPermissions, features (single doc)

Activity
  └── user (ObjectId → User), action, description, timestamp (for audit/activity feed)
```

### 3.2 Important Linking Gaps / Inconsistencies
- **Student.class** is a **string** (e.g. "Class 10"), not ObjectId to **Class**. So “which Class document this student belongs to” is by name match, not by ref.
- **Class.students[]** holds ObjectIds to Student; so the link Class → Student exists, but Student → Class is only by string.
- **Teacher** has optional **classes[]** (ref Class); **Class** has **classTeacher** and **subjects[].teacher**. So Teacher ↔ Class is linked in the DB.
- **User** is not linked by FK to Student/Teacher; linking is only by **email** in application code (e.g. in `/api/me/*` and scripts).

---

## 4. API Overview

### 4.1 Authentication (no auth middleware)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | /api/auth/login | Login (email, password) → JWT + user |
| POST | /api/auth/register | Register (name, email, password, role) |
| GET  | /api/auth/verify | Verify JWT; returns user (protected) |

### 4.2 Protected + Admin-Only Routes (protect + authorize('admin'))
- **Users:** GET/POST /api/users, PUT/DELETE /api/users/:id, PUT /api/users/:id/reset-password  
- **Settings (write):** PUT /api/settings, PUT /api/settings/school-info, etc.  
- **Stats:** GET /api/stats/dashboard (if used)

### 4.3 Protected, Any Authenticated User
- **Settings (read):** GET /api/settings (used for portal permissions, currency, etc.)

### 4.4 Student “Me” APIs (protect; student only; link by email)
| Method | Endpoint | Returns |
|--------|----------|--------|
| GET | /api/me/profile | Student or Teacher document (by req.user.email) |
| GET | /api/me/fees | Fees where student = linked Student _id |
| GET | /api/me/results | ExamMarks where student = linked Student _id |
| GET | /api/me/attendance | Attendance where student = linked Student _id |
| GET | /api/me/dashboard | Summary: profile, fees counts, today attendance, recent results |
| GET | /api/me/exams | Exam marks for linked student (with exam populates) |

All of these resolve “linked student” by: `Student.findOne({ email: req.user.email })`. No link is stored in the User document.

### 4.5 Main Resource APIs (protected; admin for most)
- **Students:** /api/students (CRUD, list, export, import, by class)
- **Teachers:** /api/teachers (CRUD, list, export, import)
- **Classes:** /api/classes (CRUD, statistics, students in class)
- **Exams:** /api/exams (CRUD, export, bulk)
- **Exam marks:** /api/exam-marks (used for results)
- **Results:** /api/results (result-oriented endpoints)
- **Fees:** /api/fees (CRUD, grouped, auto-create, slips)
- **Attendance:** /api/attendance (list, mark by date/class, today-stats, teachers mark, bulk, export/import)
- **Dashboard:** GET /api/dashboard (summary, growth, revenue, attendance, recent activities)
- **Reports:** /api/reports (various report endpoints)
- **Activities:** /api/activities (recent, by user, by entity)
- **Notifications:** /api/notifications (e.g. send pending fees)

---

## 5. Frontend Pages and Main Flows

### 5.1 Route and Access
- **Login:** `/login` → Login.tsx (email/password, calls /api/auth/login).
- **After login:** Layout wraps all other routes; sidebar depends on **user.role** and **Settings.portalPermissions** (student/teacher).
- **Admin-only routes** (e.g. /students, /teachers, /settings) are wrapped in **AdminOnlyRoute**; non-admin is redirected to `/`.

### 5.2 Main Pages (admin)
| Route | Page | Main purpose |
|-------|------|--------------|
| / | Dashboard or StudentDashboard | Role-based; admin sees Dashboard, student sees StudentDashboard |
| /students | Students | List/add/edit/delete students, import/export, filters |
| /teachers | Teachers | List/add/edit/delete teachers, import/export |
| /classes | Classes | List/add/edit classes, class teacher, students, subjects |
| /exams | Exams | List/add/edit exams, bulk, import |
| /results | Results | Add/view results (uses exam marks); filter by class, exam, student |
| /fees | Fees | List/create fees, mark paid, slips, auto-create, filters |
| /attendance | Attendance | Mark student/teacher attendance by date and class, view records, bulk, export |
| /reports | Reports | Various reports (e.g. fee, attendance, exam) |
| /settings | Settings | Tabs: School Info, Academic, System, Email, SMS, Users, Backup, Features, **Portal Permissions** |

### 5.3 Student/Teacher “My” Pages
| Route | Page | Data source |
|-------|------|-------------|
| /my/profile | MyProfile | GET /api/me/profile |
| /my/fees | MyFees | GET /api/me/fees |
| /my/results | MyResults | GET /api/me/results |
| /my/attendance | MyAttendance | GET /api/me/attendance |
| /my/exams | MyExams | GET /api/me/exams |
| /my/notifications | MyNotifications | Placeholder (no backend yet) |

### 5.4 Contexts
- **AuthContext:** user, login, logout, token in localStorage; token sent in api.ts interceptor.
- **SettingsContext:** GET /api/settings, caches settings; provides formatCurrency, formatDate, getSchoolName, getStudentPortalPermissions, getTeacherPortalPermissions.
- **ThemeContext:** light/dark theme, persisted in localStorage.

---

## 6. Settings and Configuration

### 6.1 Settings Document (single doc in DB)
- **schoolInfo:** name, address, phone, email, logo, principal, etc.
- **academicSettings:** defaultAcademicYear, terms, gradingSystem, passingPercentage, gradeScale, attendancePercentage.
- **systemSettings:** timezone, dateFormat, timeFormat, currency, itemsPerPage, notification flags.
- **portalPermissions.studentPortal:** showProfile, showFees, showExams, showResults, showAttendance, showNotifications (booleans).
- **portalPermissions.teacherPortal:** showProfile, showClasses, showAttendance, showExams, showNotifications.
- **features:** enableStudentPortal, enableTeacherPortal, enableParentPortal, enableOnlinePayment, enableIDCardGeneration, enableReportCardGeneration.

### 6.2 User Management (Settings → Users tab)
- List users from GET /api/users (id, name, email, role, createdAt, updatedAt; no password).
- Add user: POST /api/users (name, email, password, role).
- Edit user: PUT /api/users/:id (name, email, role only).
- Reset password: PUT /api/users/:id/reset-password (body: { newPassword }).
- Delete: DELETE /api/users/:id.

---

## 7. Scripts (server/scripts/)

| Script | Purpose |
|--------|--------|
| createAdmin.js | Create admin user (admin@school.com / admin123). |
| createStudentUser.js | Create one test Student + User (student@school.com / student123). |
| createAllPortalUsers.js | For every Student and Teacher in DB, create or update a User with same email and role; default passwords: student123 / teacher123. |
| seedAdmin.js | Seed admin (alternative). |
| createAcademicYears.js | Create academic year records. |
| createExams.js | Create sample exams. |
| dropOldAttendanceIndex.js | Drop old attendance index. |

---

## 8. What Is Missing or Incomplete (for analysis)

- **Teacher “me” APIs:** /api/me/fees, /api/me/results, /api/me/attendance, /api/me/dashboard, /api/me/exams are student-only. Teachers need equivalent or shared endpoints (e.g. my classes, my attendance, my timetable).
- **Teacher “My Classes” page:** Route /my/classes exists in nav but may point to a page that doesn’t exist or doesn’t call a dedicated teacher API.
- **Notifications:** MyNotifications is a placeholder; no backend or real data.
- **User ↔ Student/Teacher link in DB:** Currently only by email. Option: add `User.student` and `User.teacher` (ObjectId) and set them when creating portal users for clearer linking and one source of truth.
- **Student.class as ObjectId:** Student could reference Class by ObjectId instead of string for consistent Class ↔ Student relationship and fewer name mismatches.
- **Parent portal:** Settings have enableParentPortal but no parent role, no parent login, no parent-student link.
- **Reports:** Implemented but could be cross-checked for correct use of Fee vs Payment, ExamMark vs Result, and filters (class, date range, academic year).
- **Dashboard today attendance:** Implemented with UTC date; ensure server timezone and client expectations align.
- **Activity logging:** Activity model and logActivity may not be called from all create/update/delete endpoints consistently.

---

## 9. How to Use This Document

- **For “what’s missing”:** Use Sections 2 (portals), 4 (APIs), 5 (pages), and 8 (missing/incomplete).
- **For “how is data linked”:** Use Section 3 (models and relationships) and Section 3.2 (gaps).
- **For “how to improve linking”:** Consider adding User.student/User.teacher, Student.class as ObjectId, and ensuring Teacher “me” APIs and teacher-specific pages use the same linking rule (e.g. by email or by new User.teacher ref).

---

## 10. Questions for AI (ready-made prompts)

Copy the document (or attach this file) to ChatGPT or another AI, then use one of these prompts:

**Missing features / functions**
- "Based on the SYSTEM_DOCUMENTATION.md I shared, list all missing or incomplete functions and features in this School Management System. Prioritize by impact (e.g. teacher portal, notifications, parent portal, reports)."
- "What API endpoints and frontend pages are missing for the teacher portal to work like the student portal (e.g. my classes, my attendance, my timetable)?"

**Data linking**
- "Using the SYSTEM_DOCUMENTATION.md, explain how User, Student, Teacher, Class, Fee, Attendance, and Exam/ExamMark are linked. List every place where the link is weak (e.g. by string instead of ObjectId, or by email only) and suggest a concrete change (schema + code) to improve it."
- "Should we add User.student and User.teacher (ObjectId refs) in the database? What are the pros and cons, and how would we migrate and update the /api/me and login flow?"

**Improvements**
- "Suggest a step-by-step plan to: (1) link User to Student/Teacher in the DB, (2) add full teacher 'me' APIs and teacher portal pages, (3) implement the Notifications module for students/teachers."
- "How can we make Student.class a reference to the Class model instead of a string, and what code changes are needed in the backend and frontend?"

**Audit**
- "From the documentation, which modules might have inconsistent data (e.g. Fee vs Payment, ExamMark vs Result, Activity logging not called everywhere)? List each and suggest a quick fix or audit checklist."

---

*Document generated for the School Management System codebase. Update this file when adding new modules or changing data relationships.*
