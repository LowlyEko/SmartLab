const express    = require('express');
const router     = express.Router();
const ctrl       = require('../controllers/reservationController');
const { authenticate, requireRole } = require('../middleware/auth');

const STAFF_ROLES = ['ADMIN', 'LABORATORY_STAFF', 'LABORATORY_CHEMIST'];

/**
 * GET  /api/reservations          – All reservations (filtered by role)
 * POST /api/reservations          – Create a new reservation
 * GET  /api/reservations/:id      – Detail of one reservation
 * PATCH /api/reservations/:id/status – Admin: approve / reject / conditional
 */
router.get ('/',               authenticate,                              ctrl.getAllReservations);
router.post('/',               authenticate,                              ctrl.createReservation);
router.get ('/:id',            authenticate,                              ctrl.getReservationById);
router.patch('/:id/status',    authenticate, requireRole(...STAFF_ROLES), ctrl.updateReservationStatus);

module.exports = router;
