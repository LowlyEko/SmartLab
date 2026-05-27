// controllers/calendarController.js
const prisma = require('../config/prisma');
const { success, error } = require('../utils/response');

// ============================================================
//  GET /api/calendar/events
//  Returns manual calendar events (optionally filtered by month)
// ============================================================
exports.getEvents = async (req, res) => {
  try {
    const { year, month } = req.query; // optional ?year=2026&month=5

    let where = {};
    if (year && month) {
      const y = parseInt(year);
      const m = parseInt(month) - 1; // month is 1-indexed from query
      const start = new Date(y, m, 1);
      const end   = new Date(y, m + 1, 0); // last day of that month
      where = {
        date: { gte: start, lte: end },
      };
    }

    const events = await prisma.calendar_events.findMany({
      where,
      orderBy: { date: 'asc' },
      include: {
        admin: { select: { admin_id: true, first_name: true, last_name: true } },
      },
    });

    success(res, events);
  } catch (err) {
    error(res, err.message);
  }
};

// ============================================================
//  POST /api/calendar/events
//  Create a manual event (staff / admin only)
// ============================================================
exports.createEvent = async (req, res) => {
  try {
    const { label, date, type = 'man' } = req.body;

    if (!label || !date) {
      return res.status(400).json({ success: false, message: 'label and date are required' });
    }

    const event = await prisma.calendar_events.create({
      data: {
        label,
        date:       new Date(date),
        type,
        created_by: req.user?.admin_id ?? null,
      },
    });

    success(res, event, 'Event created');
  } catch (err) {
    error(res, err.message);
  }
};

// ============================================================
//  PUT /api/calendar/events/:id
//  Update a manual event
// ============================================================
exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { label, date, type } = req.body;

    const data = {};
    if (label !== undefined) data.label = label;
    if (date  !== undefined) data.date  = new Date(date);
    if (type  !== undefined) data.type  = type;

    const event = await prisma.calendar_events.update({
      where: { event_id: parseInt(id) },
      data,
    });

    success(res, event, 'Event updated');
  } catch (err) {
    error(res, err.message);
  }
};

// ============================================================
//  DELETE /api/calendar/events/:id
//  Delete a manual event
// ============================================================
exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.calendar_events.delete({
      where: { event_id: parseInt(id) },
    });

    success(res, { event_id: parseInt(id) }, 'Event deleted');
  } catch (err) {
    error(res, err.message);
  }
};