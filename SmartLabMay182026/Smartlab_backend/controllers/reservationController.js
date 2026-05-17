// controllers/reservationController.js
const prisma = require('../config/prisma');
const { success, error } = require('../utils/response');

// ==================== HELPERS ====================

/**
 * Standard include block used by most reservation queries.
 * Pulls in the student, members, and both equipment + chemical line items.
 *
 * FIX (Bug 3): ReservationEquipment is polymorphic (item_type + item_id),
 * so there is no Prisma-level `equipment` relation to include.
 * We select raw fields instead.
 * ReservationChemical's nested field is `chemical_name`, not `name`.
 */
const FULL_INCLUDE = {
  student: {
    select: {
      user_id:    true,
      student_id: true,
      first_name: true,
      last_name:  true,
      college:    true,
      year_level: true,
      section:    true,
    },
  },
  members: {
    select: { member_id: true, name: true },
  },
  // Polymorphic — no nested relation; return raw fields only
  equipment_items: {
    select: {
      id:        true,
      item_type: true,
      item_id:   true,
      quantity:  true,
      remarks:   true,
    },
  },
  chemical_items: {
    include: {
      chemical: {
        select: {
          chemical_id:   true,
          chemical_name: true, // schema field is chemical_name, not name
          amount:        true,
        },
      },
    },
  },
};

// ==================== ENDPOINTS ====================

/**
 * GET /api/reservations
 * - Students: only their own reservations.
 * - Staff / Admin: all reservations.
 *
 * FIX (Bug 1): student_id is nullable on the Student model (String?).
 * Google-OAuth students may not have a student_id assigned yet.
 * Passing null to Prisma where: { student_id: null } throws a
 * PrismaClientValidationError because Reservation.student_id is non-nullable.
 * Guard early and return an empty list instead.
 */
exports.getAllReservations = async (req, res) => {
  try {
    const isStudent = req.user.user_type === 'STUDENT';
    const studentId = isStudent ? req.user.student_id : null; // varchar student_id

    // Guard: student account exists but student_id hasn't been assigned yet
    if (isStudent && !studentId) {
      return success(res, [], 'No reservations found (student ID not yet assigned)');
    }

    const where = isStudent ? { student_id: studentId } : {};

    const reservations = await prisma.reservation.findMany({
      where,
      include:  FULL_INCLUDE,
      orderBy:  { date_borrowed: 'desc' },
    });

    success(res, reservations, 'Reservations fetched successfully');
  } catch (err) {
    console.error('Get Reservations Error:', err);
    error(res, 'Failed to fetch reservations', 500);
  }
};

/**
 * GET /api/reservations/:id
 */
exports.getReservationById = async (req, res) => {
  try {
    const { id } = req.params;
    const isStaff = req.user.user_type !== 'STUDENT';

    const reservation = await prisma.reservation.findUnique({
      where:   { reservation_id: parseInt(id) },
      include: FULL_INCLUDE,
    });

    if (!reservation) return error(res, 'Reservation not found', 404);

    const isOwner = reservation.student_id === req.user.student_id;
    if (!isOwner && !isStaff) return error(res, 'Access denied', 403);

    success(res, reservation);
  } catch (err) {
    console.error('Get Reservation By ID Error:', err);
    error(res, 'Failed to fetch reservation', 500);
  }
};

/**
 * POST /api/reservations
 * Body: {
 *   subject, prof_name, date_borrowed, time_of_activity,
 *   date_reserved?, course_year_section?, group_number?, type,
 *   members: [{ name }],
 *   equipment: [{ item_id, item_type, quantity, remarks? }],
 *   chemicals:  [{ chemical_id, quantity, remarks? }]
 * }
 *
 * FIX (Bug 1 — create side): Guard against null student_id before the DB call.
 *
 * FIX (Bug 2): Validate date_borrowed before passing to new Date().
 * Browsers allow typing extreme years (e.g. "12222") into date inputs.
 * new Date("12222-02-11") produces an out-of-range ISO string that Prisma
 * cannot convert, causing a PrismaClientUnknownRequestError.
 * Also validate time_of_activity format before constructing the Date.
 */
exports.createReservation = async (req, res) => {
  try {
    const studentId = req.user.student_id; // varchar

    // Guard: student must have a student_id to create a reservation
    if (!studentId) {
      return error(res, 'Your student ID has not been assigned yet. Please contact the administrator.', 400);
    }

    const {
      subject,
      prof_name,
      date_borrowed,
      date_reserved,
      time_of_activity,
      course_year_section,
      group_number,
      type,
      members   = [],
      equipment = [],
      chemicals  = [],
    } = req.body;

    // ── Required field checks ──────────────────────────────────────────────
    if (!subject?.trim())
      return error(res, 'Subject is required', 400);
    if (!date_borrowed)
      return error(res, 'date_borrowed is required', 400);
    if (!time_of_activity)
      return error(res, 'time_of_activity is required', 400);
    if (!type?.trim())
      return error(res, 'type is required', 400);

    // ── FIX (Bug 2): Date range validation ────────────────────────────────
    const parsedDateBorrowed = new Date(date_borrowed);
    if (
      isNaN(parsedDateBorrowed.getTime()) ||
      parsedDateBorrowed.getFullYear() < 2000 ||
      parsedDateBorrowed.getFullYear() > 2100
    ) {
      return error(res, 'Invalid date_borrowed. Please enter a valid date between 2000 and 2100.', 400);
    }

    const parsedTime = new Date(`1970-01-01T${time_of_activity}`);
    if (isNaN(parsedTime.getTime())) {
      return error(res, 'Invalid time_of_activity format. Expected HH:MM or HH:MM:SS.', 400);
    }

    let parsedDateReserved = new Date();
    if (date_reserved) {
      parsedDateReserved = new Date(date_reserved);
      if (
        isNaN(parsedDateReserved.getTime()) ||
        parsedDateReserved.getFullYear() < 2000 ||
        parsedDateReserved.getFullYear() > 2100
      ) {
        return error(res, 'Invalid date_reserved. Please enter a valid date.', 400);
      }
    }

    // ── Persist ───────────────────────────────────────────────────────────
    const reservation = await prisma.reservation.create({
      data: {
        student_id:          studentId,
        subject:             subject.trim(),
        prof_name:           prof_name?.trim()           || null,
        date_reserved:       parsedDateReserved,
        date_borrowed:       parsedDateBorrowed,
        time_of_activity:    parsedTime,
        course_year_section: course_year_section?.trim() || null,
        group_number:        group_number ? parseInt(group_number) : null,
        type:                type.trim(),
        status:              'Pending',
        // Members — stored as plain names
        members: {
          create: members
            .filter(m => m?.name?.trim())
            .map(m => ({ name: m.name.trim() })),
        },
        // Equipment line items (polymorphic: item_type + item_id)
        equipment_items: {
          create: equipment
            .filter(e => e?.item_id && e?.item_type)
            .map(e => ({
              item_id:   BigInt(e.item_id),
              item_type: e.item_type,
              quantity:  parseInt(e.quantity) || 1,
              remarks:   e.remarks?.trim()    || null,
            })),
        },
        // Chemical line items
        chemical_items: {
          create: chemicals
            .filter(c => c?.chemical_id)
            .map(c => ({
              chemical_id: BigInt(c.chemical_id),
              quantity:    parseInt(c.quantity) || 1,
              remarks:     c.remarks?.trim()   || null,
            })),
        },
      },
      include: FULL_INCLUDE,
    });

    success(res, reservation, 'Reservation submitted successfully!', 201);
  } catch (err) {
    console.error('Create Reservation Error:', err);
    error(res, 'Failed to create reservation', 500, err.message);
  }
};

/**
 * PATCH /api/reservations/:id/status
 * Staff / Admin only.
 * Body: { status: 'Approved'|'Rejected'|'Pending' }
 *
 * The new DB uses plain varchar status values (not enums):
 *   'Pending'  → awaiting review
 *   'Approved' → allowed
 *   'Rejected' → denied
 */
exports.updateReservationStatus = async (req, res) => {
  try {
    const { id }    = req.params;
    const actorType = req.user.user_type;

    if (actorType === 'STUDENT') return error(res, 'Insufficient permissions', 403);

    const VALID = ['Approved', 'Rejected', 'Pending'];
    const { status } = req.body;

    if (!status || !VALID.includes(status))
      return error(res, `status must be one of: ${VALID.join(', ')}`, 400);

    const existing = await prisma.reservation.findUnique({
      where: { reservation_id: parseInt(id) },
    });
    if (!existing) return error(res, 'Reservation not found', 404);

    const updated = await prisma.reservation.update({
      where: { reservation_id: parseInt(id) },
      data:  {
        status,
        admin_id:           req.user.user_id,
        signed_by_admin_id: status === 'Approved' ? req.user.user_id : null,
      },
      include: FULL_INCLUDE,
    });

    success(res, updated, `Reservation ${status.toLowerCase()} successfully`);
  } catch (err) {
    console.error('Update Reservation Status Error:', err);
    error(res, 'Failed to update reservation status', 500);
  }
};