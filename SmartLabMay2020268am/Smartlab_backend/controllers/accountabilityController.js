// controllers/accountabilityController.js
const prisma = require('../config/prisma');
const { success, error } = require('../utils/response');


// ============================================================
//  HELPERS
// ============================================================

/**
 * Safely parse a date string into a Date object.
 * Throws a plain Error (no clientVersion) if the value is invalid
 * so the catch block in each handler can return a 400 instead of a 500.
 */
function safeDate(value, fieldName) {
  const d = new Date(value);
  if (isNaN(d.getTime())) throw new Error(`Invalid date for field: ${fieldName}`);
  return d;
}

/**
 * Convert a time string that may be in 12-hour format ("08:46 pm")
 * or already in 24-hour format ("20:46") into a Date object anchored
 * to 1970-01-01 so Prisma can store it as a TIME-like DateTime.
 *
 * Accepts:
 *   "HH:mm"        → already 24-hour, used directly
 *   "HH:mm am/pm"  → converted to 24-hour first
 *   "HH:mm:ss"     → seconds stripped / kept as-is
 */
function safeTime(value, fieldName) {
  if (!value) return null;

  const str = String(value).trim().toLowerCase();

  // Detect 12-hour format: contains "am" or "pm"
  const twelveHourMatch = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)$/);
  if (twelveHourMatch) {
    let hours   = parseInt(twelveHourMatch[1], 10);
    const mins  = twelveHourMatch[2];
    const ampm  = twelveHourMatch[3];

    if (ampm === 'pm' && hours !== 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours  = 0;

    const iso = `1970-01-01T${String(hours).padStart(2, '0')}:${mins}:00`;
    const d   = new Date(iso);
    if (isNaN(d.getTime())) throw new Error(`Invalid time for field: ${fieldName}`);
    return d;
  }

  // 24-hour format: "HH:mm" or "HH:mm:ss"
  const twentyFourMatch = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (twentyFourMatch) {
    const iso = `1970-01-01T${str.length === 5 ? str + ':00' : str}`;
    const d   = new Date(iso);
    if (isNaN(d.getTime())) throw new Error(`Invalid time for field: ${fieldName}`);
    return d;
  }

  throw new Error(`Unrecognised time format for field: ${fieldName} (got "${value}")`);
}


// ============================================================
//  SHARED INCLUDE
// ============================================================

const FULL_INCLUDE = {
  student:     { select: { user_id: true, student_id: true, first_name: true, last_name: true, section: true, college: true } },
  reservation: { select: { reservation_id: true, subject: true, date_borrowed: true, group_number: true } },
  receiver:    { select: { admin_id: true, first_name: true, last_name: true } },
  members:     { select: { id: true, member_name: true, member_order: true }, orderBy: { member_order: 'asc' } },
};

// ============================================================
//  STUDENT ENDPOINTS
// ============================================================

/**
 * GET /api/accountability/mine
 * Student: view their own accountability records.
 * Queries by student_id (varchar) if set, otherwise falls back to user_id join.
 */
exports.getMyAccountability = async (req, res) => {
  try {
    const where = req.user.student_id
      ? { student_id: req.user.student_id }
      : { student: { user_id: req.user.user_id } };

    const records = await prisma.accountability.findMany({
      where,
      include: FULL_INCLUDE,
      orderBy: { created_at: 'desc' },
    });

    success(res, records);
  } catch (err) {
    error(res, err.message);
  }
};

// ============================================================
//  ADMIN / STAFF ENDPOINTS
// ============================================================

/**
 * GET /api/accountability
 * Staff/Admin: all records.
 */
exports.getAllRecords = async (req, res) => {
  try {
    const records = await prisma.accountability.findMany({
      include: FULL_INCLUDE,
      orderBy: { created_at: 'desc' },
    });
    success(res, records);
  } catch (err) {
    error(res, err.message);
  }
};

/**
 * POST /api/accountability
 * Students and Staff can create a record.
 * If a student submits, student_id is automatically taken from their token
 * so the record is always linked to them even if they forget to send it.
 */
exports.createRecord = async (req, res) => {
  try {
    const {
      reservation_id,
      date_borrowed,
      member_name,
      materials_broken,
      prof_name,
      subject,
      time_start,
      time_end,
      program_course_section,
      deadline,
      remarks,
      members = [],
    } = req.body;

    // For students: always use the student_id from their token.
    // For staff: they can pass a student_id in the body to assign to someone.
    let student_id   = req.user.is_staff ? (req.body.student_id || null) : (req.user.student_id || null);
    let student_name = req.body.student_name?.trim() || null;

    if (!member_name?.trim())
      return error(res, 'member_name is required', 400);
    if (!materials_broken?.trim())
      return error(res, 'materials_broken is required', 400);
    if (!prof_name?.trim())
      return error(res, 'prof_name is required', 400);
    if (!subject?.trim())
      return error(res, 'subject is required', 400);
    if (!program_course_section?.trim())
      return error(res, 'program_course_section is required', 400);
    if (!date_borrowed)
      return error(res, 'date_borrowed is required', 400);

    // Verify student exists if student_id provided
    if (student_id) {
      const student = await prisma.student.findUnique({ where: { student_id } });
      if (!student) return error(res, `Student ${student_id} not found`, 404);
    }

    const record = await prisma.accountability.create({
      data: {
        student_id:             student_id,
        student_name:           student_name,
        reservation_id:         reservation_id ? parseInt(reservation_id) : null,
        date_borrowed:          safeDate(date_borrowed, 'date_borrowed'),
        member_name:            member_name.trim(),
        materials_broken:       materials_broken.trim(),
        prof_name:              prof_name.trim(),
        subject:                subject.trim(),
        time_start:             safeTime(time_start, 'time_start'),
        time_end:               safeTime(time_end,   'time_end'),
        program_course_section: program_course_section.trim(),
        deadline:               deadline ? safeDate(deadline, 'deadline') : null,
        remarks:                remarks?.trim() || null,
        members: {
          create: members
            .filter(m => m?.name?.trim())
            .map((m, i) => ({ member_name: m.name.trim(), member_order: m.order ?? i })),
        },
      },
      include: FULL_INCLUDE,
    });

    success(res, record, 'Accountability record created successfully', 201);
  } catch (err) {
    // safeDate / safeTime throw plain Errors; Prisma errors have a clientVersion property
    if (!err.clientVersion) return error(res, err.message, 400);
    console.error('Create Accountability Error:', err);
    error(res, 'Failed to create record. Please check your inputs.');
  }
};

/**
 * PUT /api/accountability/:id
 * Staff/Admin: update any field. Replaces member rows wholesale if `members` is provided.
 */
exports.updateRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      student_id,
      student_name,
      reservation_id,
      date_borrowed,
      member_name,
      materials_broken,
      prof_name,
      subject,
      time_start,
      time_end,
      program_course_section,
      deadline,
      remarks,
      date_replaced,
      received_by,
      members,
    } = req.body;

    const data = {};
    if (student_id             !== undefined) data.student_id             = student_id             || null;
    if (student_name           !== undefined) data.student_name           = student_name?.trim()   || null;
    if (reservation_id         !== undefined) data.reservation_id         = reservation_id ? parseInt(reservation_id) : null;
    if (date_borrowed          !== undefined) data.date_borrowed          = safeDate(date_borrowed, 'date_borrowed');
    if (member_name            !== undefined) data.member_name            = member_name.trim();
    if (materials_broken       !== undefined) data.materials_broken       = materials_broken.trim();
    if (prof_name              !== undefined) data.prof_name              = prof_name.trim();
    if (subject                !== undefined) data.subject                = subject.trim();
    if (time_start             !== undefined) data.time_start             = safeTime(time_start, 'time_start');
    if (time_end               !== undefined) data.time_end               = safeTime(time_end,   'time_end');
    if (program_course_section !== undefined) data.program_course_section = program_course_section.trim();
    if (deadline               !== undefined) data.deadline               = deadline ? safeDate(deadline, 'deadline') : null;
    if (remarks                !== undefined) data.remarks                = remarks?.trim()         || null;
    if (date_replaced          !== undefined) data.date_replaced          = date_replaced ? safeDate(date_replaced, 'date_replaced') : null;
    if (received_by            !== undefined) data.received_by            = received_by ? parseInt(received_by) : null;

    if (Array.isArray(members)) {
      data.members = {
        deleteMany: {},
        create: members
          .filter(m => m?.name?.trim())
          .map((m, i) => ({ member_name: m.name.trim(), member_order: m.order ?? i })),
      };
    }

    const record = await prisma.accountability.update({
      where:   { accountability_id: parseInt(id) },
      data,
      include: FULL_INCLUDE,
    });

    success(res, record, 'Record updated successfully');
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Record not found', 404);
    if (!err.clientVersion) return error(res, err.message, 400);
    console.error('Update Accountability Error:', err);
    error(res, 'Failed to update record. Please check your inputs.');
  }
};

/**
 * PATCH /api/accountability/:id/resolve
 */
exports.resolveRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks, received_by } = req.body;

    const record = await prisma.accountability.update({
      where: { accountability_id: parseInt(id) },
      data: {
        date_replaced: new Date(),
        received_by:   received_by ? parseInt(received_by) : req.user.user_id,
        remarks:       remarks?.trim() || null,
      },
      include: FULL_INCLUDE,
    });

    success(res, record, 'Accountability record resolved successfully');
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Record not found', 404);
    error(res, err.message);
  }
};

/**
 * DELETE /api/accountability/:id
 */
exports.deleteRecord = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.accountability.delete({
      where: { accountability_id: parseInt(id) },
    });

    success(res, { accountability_id: parseInt(id) }, 'Record deleted successfully');
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Record not found', 404);
    console.error('Delete Accountability Error:', err);
    error(res, err.message);
  }
};

// ============================================================
//  DROPDOWN HELPERS
// ============================================================

exports.getStudents = async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      where:   { is_active: true },
      select:  { user_id: true, student_id: true, first_name: true, last_name: true, section: true },
      orderBy: [{ last_name: 'asc' }, { first_name: 'asc' }],
    });
    success(res, students);
  } catch (err) {
    error(res, err.message);
  }
};

exports.getReservations = async (req, res) => {
  try {
    const reservations = await prisma.reservation.findMany({
      select: {
        reservation_id: true,
        subject:        true,
        date_borrowed:  true,
        group_number:   true,
        student_id:     true,
        student: { select: { first_name: true, last_name: true } },
      },
      orderBy: { date_borrowed: 'desc' },
    });
    success(res, reservations);
  } catch (err) {
    error(res, err.message);
  }
};