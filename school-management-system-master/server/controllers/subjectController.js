const asyncHandler = require('express-async-handler');
const Subject = require('../models/Subject');
const { searchRegexFromQuery, pickSortField } = require('../utils/queryHelpers');

const SUBJECT_LIST_SORT = ['name', 'code', 'sortOrder', 'isActive', 'createdAt', 'updatedAt'];

function buildFilter(req) {
  const filter = {};
  if (req.query.isActive === 'true' || req.query.isActive === '1') {
    filter.isActive = true;
  } else if (req.query.isActive === 'false' || req.query.isActive === '0') {
    filter.isActive = false;
  } else if (req.query.all !== 'true' && !req.query.includeInactive) {
    filter.isActive = true;
  }
  if (req.query.search) {
    const rx = searchRegexFromQuery(req.query.search);
    if (rx) {
      filter.$or = [{ name: rx }, { code: rx }, { description: rx }];
    }
  }
  return filter;
}

exports.getSubjects = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(2000, Math.max(1, parseInt(req.query.limit, 10) || 500));
  const skip = (page - 1) * limit;

  const sortField = pickSortField(req.query.sortBy, SUBJECT_LIST_SORT, 'sortOrder');
  const sortDir = req.query.sortOrder === 'desc' ? -1 : 1;
  const hasExplicitSort = req.query.sortBy != null && String(req.query.sortBy) !== '';
  const sort = hasExplicitSort
    ? { [sortField]: sortDir }
    : { sortOrder: 1, name: 1 };

  const filter = buildFilter(req);
  const total = await Subject.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const subjects = await Subject.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  res.json({
    success: true,
    data: subjects,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: total,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
});

exports.getSubject = asyncHandler(async (req, res) => {
  const subject = await Subject.findById(req.params.id);
  if (!subject) {
    return res.status(404).json({ success: false, message: 'Subject not found' });
  }
  res.json({ success: true, data: subject });
});

exports.createSubject = asyncHandler(async (req, res) => {
  const { name, code, description, isActive, sortOrder } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ success: false, message: 'Name is required' });
  }
  const exists = await Subject.findOne({ name: String(name).trim() });
  if (exists) {
    return res.status(400).json({ success: false, message: 'A subject with this name already exists' });
  }
  const subject = await Subject.create({
    name: String(name).trim(),
    code: code != null ? String(code).trim() : '',
    description: description != null ? String(description).trim() : '',
    isActive: isActive !== false,
    sortOrder: sortOrder != null ? Number(sortOrder) : 0,
  });
  res.status(201).json({ success: true, data: subject });
});

exports.updateSubject = asyncHandler(async (req, res) => {
  const { name, code, description, isActive, sortOrder } = req.body;
  const subject = await Subject.findById(req.params.id);
  if (!subject) {
    return res.status(404).json({ success: false, message: 'Subject not found' });
  }
  if (name != null && String(name).trim() && String(name).trim() !== subject.name) {
    const taken = await Subject.findOne({ name: String(name).trim(), _id: { $ne: subject._id } });
    if (taken) {
      return res.status(400).json({ success: false, message: 'A subject with this name already exists' });
    }
    subject.name = String(name).trim();
  }
  if (code !== undefined) subject.code = String(code || '').trim();
  if (description !== undefined) subject.description = String(description || '').trim();
  if (isActive !== undefined) subject.isActive = Boolean(isActive);
  if (sortOrder !== undefined) subject.sortOrder = Number(sortOrder) || 0;
  await subject.save();
  res.json({ success: true, data: subject });
});

exports.deleteSubject = asyncHandler(async (req, res) => {
  const subject = await Subject.findByIdAndDelete(req.params.id);
  if (!subject) {
    return res.status(404).json({ success: false, message: 'Subject not found' });
  }
  res.json({ success: true, message: 'Subject deleted' });
});
