const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads and subdirectories exist
const uploadDir = path.join(__dirname, '..', 'uploads');
const teachersDir = path.join(uploadDir, 'teachers');
const studentsDir = path.join(uploadDir, 'students');

[uploadDir, teachersDir, studentsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Determine the upload directory based on the route
    const uploadPath = req.baseUrl.includes('teachers') ? teachersDir : 
                      req.baseUrl.includes('students') ? studentsDir : 
                      uploadDir;
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.'), false);
  }
};

// Initialize upload
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

module.exports = upload; 