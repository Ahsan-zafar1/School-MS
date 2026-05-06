const Student = require('../models/Student');
const Teacher = require('../models/Teacher');

/**
 * Resolve the Student linked to a User.
 * 1. If user.student (ObjectId) is set, fetch Student by _id (and ensure active).
 * 2. Otherwise fallback: find Student by user.email (case-insensitive, active).
 * @param {Object} user - User document or plain object with optional .student (ObjectId), .email
 * @returns {Promise<Object|null>} Student document (lean) or null
 */
async function getLinkedStudent(user) {
  if (!user) return null;
  if (user.student) {
    const byId = await Student.findById(user.student).lean();
    if (byId && byId.isActive !== false) return byId;
  }
  const email = (user.email || '').trim().toLowerCase();
  if (!email) return null;
  return Student.findOne({ email, isActive: true }).lean();
}

/**
 * Resolve the Teacher linked to a User.
 * 1. If user.teacher (ObjectId) is set, fetch Teacher by _id (and ensure active).
 * 2. Otherwise fallback: find Teacher by user.email (case-insensitive, active).
 * @param {Object} user - User document or plain object with optional .teacher (ObjectId), .email
 * @returns {Promise<Object|null>} Teacher document (lean) or null
 */
async function getLinkedTeacher(user) {
  if (!user) return null;
  if (user.teacher) {
    const byId = await Teacher.findById(user.teacher).lean();
    if (byId && byId.isActive !== false) return byId;
  }
  const email = (user.email || '').trim().toLowerCase();
  if (!email) return null;
  return Teacher.findOne({ email, isActive: true }).lean();
}

module.exports = {
  getLinkedStudent,
  getLinkedTeacher
};
