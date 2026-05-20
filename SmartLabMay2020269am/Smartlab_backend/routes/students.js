// routes/students.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/studentController');
const { authenticate } = require('../middleware/auth');

// PATCH /api/students/me  — student sets their own student_id after first Google login
router.patch('/me', authenticate, ctrl.completeProfile);

module.exports = router;