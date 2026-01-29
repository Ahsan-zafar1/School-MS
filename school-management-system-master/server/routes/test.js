const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

/**
 * @swagger
 * /api/test:
 *   get:
 *     summary: Test endpoint
 *     description: Returns a test message
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.get('/', (req, res) => {
  res.json({ message: 'Test endpoint working' });
});

/**
 * @swagger
 * /api/test/test-db:
 *   get:
 *     summary: Test database connection
 *     description: Checks if the database connection is working
 *     responses:
 *       200:
 *         description: Successful database connection
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 status:
 *                   type: string
 *                 database:
 *                   type: string
 *                 host:
 *                   type: string
 */
router.get('/test-db', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1;
  res.json({
    success: dbStatus,
    status: dbStatus ? 'connected' : 'disconnected',
    database: 'school-management',
    host: mongoose.connection.host
  });
});

module.exports = router; 