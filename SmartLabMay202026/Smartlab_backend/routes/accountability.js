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
  getReservations,
} = require('../controllers/accountabilityController');

const { authenticate, requireStaff, requireRole, STAFF_ROLES } = require('../middleware/auth');

// ── Student routes ────────────────────────────────────────────────────────────
// GET  /api/accountability/mine  — student sees their own records
router.get('/mine', authenticate, getMyAccountability);

// POST /api/accountability — students (and staff) can create a record
router.post('/', authenticate, createRecord);

// ── Staff / Admin routes ──────────────────────────────────────────────────────
// Dropdown helpers
router.get('/students',     authenticate, requireStaff, getStudents);
router.get('/reservations', authenticate, requireStaff, getReservations);

// GET /api/accountability  — all records
router.get('/', authenticate, requireStaff, getAllRecords);

// PUT  /api/accountability/:id         — full edit
router.put('/:id', authenticate, requireStaff, updateRecord);

// PATCH /api/accountability/:id/resolve — quick resolve
router.patch('/:id/resolve', authenticate, requireStaff, resolveRecord);

// DELETE /api/accountability/:id — hard delete (laboratory_staff only)
router.delete(
  '/:id',
  authenticate,
  requireRole('laboratory_staff'),
  deleteRecord
);

module.exports = router;