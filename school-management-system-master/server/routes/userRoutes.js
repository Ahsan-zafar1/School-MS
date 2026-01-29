const express = require('express');
const router = express.Router();

// In-memory user list
let users = [
  { id: 1, username: 'admin', role: 'admin', email: 'admin@example.com' },
  { id: 2, username: 'teacher1', role: 'teacher', email: 'teacher1@example.com' }
];

// ✅ Export endpoint
router.get('/all', (req, res) => {
  res.json(users);
});

// ✅ Get all users (dashboard)
router.get('/', (req, res) => {
  res.json(users);
});

// ✅ Add new user
router.post('/', (req, res) => {
  const { username, role, email } = req.body;
  if (!username || !role || !email) {
    return res.status(400).json({ message: 'Missing fields' });
  }
  const newUser = {
    id: Date.now(),
    username,
    role,
    email
  };
  users.push(newUser);
  res.json({ message: 'User added', user: newUser });
});

// ✅ Delete user by username
router.delete('/:username', (req, res) => {
  const { username } = req.params;
  users = users.filter(u => u.username !== username);
  res.json({ message: 'User deleted' });
});

module.exports = router;
