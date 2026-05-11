// routes/reservations.js
const express = require('express');
const router = express.Router();

const { 
  getMyReservations, 
  createReservation,
  getAllReservations,
  updateReservationStatus 
} = require('../controllers/reservationController');

const { authenticate, requireRole } = require('../middleware/auth');

// ===================== STUDENT ROUTES =====================
router.get('/my', authenticate, getMyReservations);           // Students see their reservations
router.post('/', authenticate, createReservation);            // Students can create reservations

// ===================== STAFF ROUTES =====================
router.get('/', authenticate, requireRole('LABORATORY_STAFF', 'ADMIN'), getAllReservations);
router.put('/:id/status', authenticate, requireRole('LABORATORY_STAFF', 'ADMIN'), updateReservationStatus);

module.exports = router;