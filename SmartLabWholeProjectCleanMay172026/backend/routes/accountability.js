// routes/accountability.js
const express = require('express');
const router  = express.Router();

const {
  getMyAccountability,
  createRecord,
  getAllRecords,
  updateRecord,
  resolveRecord,
  deleteRecord,
  getStudents,
  getReservations
} = require('../controllers/accountabilityController');

const { authenticate, requireRole } = require('../middleware/auth');

// ===================== STUDENT ROUTES =====================

// GET  /api/accountability/my   — student sees their own records
router.get('/my', authenticate, getMyAccountability);

// POST /api/accountability      — student or admin creates a record
router.post('/', authenticate, createRecord);

// ===================== STAFF / ADMIN ROUTES =====================

// GET /api/accountability/students     — list of students for admin dropdowns
router.get(
  '/students',
  authenticate,
  requireRole('LABORATORY_STAFF', 'ADMIN', 'LABORATORY_CHEMIST'),
  getStudents
);

// GET /api/accountability/reservations — list of reservations for admin dropdowns
router.get(
  '/reservations',
  authenticate,
  requireRole('LABORATORY_STAFF', 'ADMIN', 'LABORATORY_CHEMIST'),
  getReservations
);

// GET /api/accountability       — all records (staff, admin, chemist)
router.get(
  '/',
  authenticate,
  requireRole('LABORATORY_STAFF', 'ADMIN', 'LABORATORY_CHEMIST'),
  getAllRecords
);

// PUT /api/accountability/:id   — full edit (admin only)
router.put(
  '/:id',
  authenticate,
  requireRole('LABORATORY_STAFF', 'ADMIN'),
  updateRecord
);

// PUT /api/accountability/:id/resolve  — quick-resolve (staff + admin)
router.put(
  '/:id/resolve',
  authenticate,
  requireRole('LABORATORY_STAFF', 'ADMIN'),
  resolveRecord
);

// DELETE /api/accountability/:id  — hard delete (admin only)
router.delete(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  deleteRecord
);

module.exports = router;
