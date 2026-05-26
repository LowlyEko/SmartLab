// routes/calendar.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/calendarController');
const { authenticate, requireStaff } = require('../middleware/auth');

// GET  /api/calendar/events           — fetch stored manual events (staff only)
// POST /api/calendar/events           — create manual event (staff only)
// PUT  /api/calendar/events/:id       — edit manual event (staff only)
// DELETE /api/calendar/events/:id     — delete manual event (staff only)
router.get   ('/events',      authenticate, requireStaff, ctrl.getEvents);
router.post  ('/events',      authenticate, requireStaff, ctrl.createEvent);
router.put   ('/events/:id',  authenticate, requireStaff, ctrl.updateEvent);
router.delete('/events/:id',  authenticate, requireStaff, ctrl.deleteEvent);

module.exports = router;