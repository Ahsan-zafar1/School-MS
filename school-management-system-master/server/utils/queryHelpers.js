/**
 * Safe search/sort for list routes — unescaped user input in RegExp can throw or cause ReDoS.
 */
function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * @param {string} [raw] — query value
 * @returns {RegExp | null} null if empty/invalid
 */
function searchRegexFromQuery(raw) {
  if (raw == null || String(raw).trim() === '') return null;
  return new RegExp(escapeRegex(String(raw).trim()), 'i');
}

/**
 * @param {string|undefined} value
 * @param {string[]} allowed
 * @param {string} defaultField
 * @returns {string}
 */
function pickSortField(value, allowed, defaultField) {
  if (value == null || value === '') return defaultField;
  const v = String(value);
  if (allowed.includes(v)) return v;
  return defaultField;
}

const CLASS_LIST_SORT = [
  'name',
  'section',
  'grade',
  'classId',
  'roomNumber',
  'academicYear',
  'capacity',
  'isActive',
  'status',
  'createdAt',
  'updatedAt',
];

const EXAM_LIST_SORT = [
  'date',
  'examName',
  'subject',
  'class',
  'academicYear',
  'examId',
  'examType',
  'status',
  'isActive',
  'totalMarks',
  'passingMarks',
  'roomNumber',
  'createdAt',
  'updatedAt',
];

const STUDENT_LIST_SORT = [
  'name',
  'rollNumber',
  'class',
  'studentId',
  'academicYear',
  'dateOfBirth',
  'admissionDate',
  'gender',
  'isActive',
  'email',
  'phone',
  'createdAt',
  'updatedAt',
];

const TEACHER_LIST_SORT = [
  'name',
  'employeeId',
  'email',
  'phone',
  'qualification',
  'subject',
  'isActive',
  'createdAt',
  'updatedAt',
];

const ATTENDANCE_LIST_SORT = [
  'date',
  'createdAt',
  'updatedAt',
  'type',
  'status',
  'class',
  'academicYear',
  'attendanceId',
  'remarks',
  'isActive',
  'student',
  'teacher',
];

const FEE_LIST_SORT = [
  'feeId',
  'class',
  'academicYear',
  'amount',
  'dueDate',
  'status',
  'currency',
  'feeType',
  'month',
  'description',
  'transactionId',
  'isActive',
  'createdAt',
  'updatedAt',
  'student',
];

const EXAM_MARK_LIST_SORT = [
  'name',
  'class',
  'academicYear',
  'obtainedMarks',
  'marksObtained',
  'totalMarks',
  'term',
  'date',
  'status',
  'isActive',
  'createdAt',
  'updatedAt',
  'subject',
  'resultId',
  'grade',
  'student',
  'exam',
  'rollNumber',
];

module.exports = {
  escapeRegex,
  searchRegexFromQuery,
  pickSortField,
  CLASS_LIST_SORT,
  EXAM_LIST_SORT,
  STUDENT_LIST_SORT,
  TEACHER_LIST_SORT,
  FEE_LIST_SORT,
  EXAM_MARK_LIST_SORT,
  ATTENDANCE_LIST_SORT,
};
