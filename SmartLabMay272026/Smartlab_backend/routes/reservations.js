// routes/reservations.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/reservationController');
const { authenticate, requireStaff } = require('../middleware/auth');

// GET    /api/reservations            — filtered by role inside controller
// POST   /api/reservations            — create (students + staff)
// GET    /api/reservations/:id        — detail view
// PUT    /api/reservations/:id        — student edit own Pending reservation
// PATCH  /api/reservations/:id/status — students can cancel their own; staff can approve/reject
router.get   ('/',            authenticate,              ctrl.getAllReservations);
router.post  ('/',            authenticate,              ctrl.createReservation);
router.get   ('/:id',         authenticate,              ctrl.getReservationById);
router.put   ('/:id',         authenticate,              ctrl.updateReservation);
router.patch ('/:id/status',  authenticate,              ctrl.updateReservationStatus);

// PATCH /api/reservations/:id/admin-edit — staff edit status, remarks, date
router.patch('/:id/admin-edit', authenticate, ctrl.adminEditReservation);

module.exports = router;