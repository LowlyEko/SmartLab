// routes/accountability.js
const express = require('express');
const router = express.Router();
const { 
  getMyAccountability,
  createRecord,
  getAllRecords,
  resolveRecord 
} = require('../controllers/accountabilityController');

const { authenticate, requireRole } = require('../middleware/auth');

// ===================== STUDENT ROUTES =====================
router.get('/my', authenticate, getMyAccountability);           // Students see only their records
router.post('/', authenticate, createRecord);                   // Students can report broken items

// ===================== STAFF ROUTES =====================
router.get('/', authenticate, requireRole('LABORATORY_STAFF', 'ADMIN', 'LABORATORY_CHEMIST'), getAllRecords);
router.put('/:id/resolve', authenticate, requireRole('LABORATORY_STAFF', 'ADMIN'), resolveRecord);

module.exports = router;