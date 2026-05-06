/**
 * Creates a portal login User when a Student or Teacher is created.
 * Uses email if present, otherwise username = studentId/rollNumber or teacherId.
 * Default passwords: student123 / teacher123.
 * Does not throw; returns { created, user, message } so the main request is not failed.
 */
const User = require('../models/User');

const DEFAULT_STUDENT_PASSWORD = 'student123';
const DEFAULT_TEACHER_PASSWORD = 'teacher123';

/**
 * Create a portal User for a newly created Student.
 * @param {Object} student - Student document (must have _id, name, email?, studentId?, rollNumber?)
 * @returns {Promise<{ created: boolean, user?: Object, message: string }>}
 */
async function createPortalUserForStudent(student) {
  try {
    const email = (student.email || '').trim().toLowerCase() || null;
    const loginId = (student.studentId || student.rollNumber || student._id?.toString() || '')
      .toString()
      .toLowerCase()
      .replace(/\s/g, '');
    const existingByEmail = email ? await User.findOne({ email }) : null;
    const existingByUsername = loginId ? await User.findOne({ username: loginId }) : null;
    if (existingByEmail || existingByUsername) {
      return { created: false, message: 'Portal user already exists for this email or username' };
    }
    const user = await User.create({
      name: student.name || 'Student',
      email: email || undefined,
      username: email ? undefined : (loginId || undefined),
      password: DEFAULT_STUDENT_PASSWORD,
      role: 'student',
      student: student._id
    });
    return { created: true, user, message: 'Portal user created; login: ' + (email || loginId) };
  } catch (err) {
    return { created: false, message: err.message || 'Failed to create portal user' };
  }
}

/**
 * Create a portal User for a newly created Teacher.
 * @param {Object} teacher - Teacher document (must have _id, name, email?, teacherId?)
 * @returns {Promise<{ created: boolean, user?: Object, message: string }>}
 */
async function createPortalUserForTeacher(teacher) {
  try {
    const email = (teacher.email || '').trim().toLowerCase() || null;
    const loginId = (teacher.teacherId || teacher._id?.toString() || '')
      .toString()
      .toLowerCase()
      .replace(/\s/g, '');
    const existingByEmail = email ? await User.findOne({ email }) : null;
    const existingByUsername = loginId ? await User.findOne({ username: loginId }) : null;
    if (existingByEmail || existingByUsername) {
      return { created: false, message: 'Portal user already exists for this email or username' };
    }
    const user = await User.create({
      name: teacher.name || 'Teacher',
      email: email || undefined,
      username: email ? undefined : (loginId || undefined),
      password: DEFAULT_TEACHER_PASSWORD,
      role: 'teacher',
      teacher: teacher._id
    });
    return { created: true, user, message: 'Portal user created; login: ' + (email || loginId) };
  } catch (err) {
    return { created: false, message: err.message || 'Failed to create portal user' };
  }
}

module.exports = {
  createPortalUserForStudent,
  createPortalUserForTeacher
};
