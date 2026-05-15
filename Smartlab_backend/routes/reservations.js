const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const { authenticate } = require('../middleware/auth');

/**
 * @route   GET /api/reservations
 * @desc    Get all reservations (Filtered for Students, all for Staff/Admin)
 * @access  Private
 */
router.get('/', authenticate, reservationController.getAllReservations);

/**
 * @route   POST /api/reservations
 * @desc    Create a new reservation with associated members and equipment
 * @access  Private
 */
router.post('/', authenticate, reservationController.createReservation);

/**
 * @route   GET /api/reservations/:id
 * @desc    Get detailed view of a specific reservation
 * @access  Private (Owner, Member, or Staff/Admin)
 */
router.get('/:id', authenticate, reservationController.getReservationById);

module.exports = router;