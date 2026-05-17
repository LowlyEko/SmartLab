const prisma = require('../config/prisma');
const { success, error } = require('../utils/response');

/**
 * GET /api/reservations
 * - Students: only own reservations or ones they are members of
 * - Staff / Admin: all reservations
 */
exports.getAllReservations = async (req, res) => {
  try {
    const userId    = req.user.user_id;
    const isStudent = req.user.user_type === 'STUDENT';

    const whereClause = isStudent
      ? { OR: [{ reserving_student: userId }, { members: { some: { student_id: userId } } }] }
      : {};

    const reservations = await prisma.reservation.findMany({
      where: whereClause,
      include: {
        reservingStudent: {
          select: {
            user_id:        true,
            first_name:     true,
            last_name:      true,
            student_number: true,
            college:        true,
            year_level:     true,
            section:        true
          }
        },
        members: {
          include: {
            student: { select: { first_name: true, last_name: true, student_number: true } }
          }
        },
        items: {
          include: {
            item: { select: { item_id: true, name: true, category: true, unit: true } }
          }
        }
      },
      orderBy: { date_requested: 'desc' }
    });

    success(res, reservations, 'Reservations fetched successfully');
  } catch (err) {
    console.error('Get Reservations Error:', err);
    error(res, 'Failed to fetch reservations', 500);
  }
};

/**
 * POST /api/reservations
 * Create a new reservation (students only in practice, but any authenticated user).
 */
exports.createReservation = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const {
      date_needed,
      time_start,
      time_end,
      activity_title,
      group_number,
      conditions_note,
      items      = [],
      member_ids = []
    } = req.body;

    if (!date_needed || !time_start || !time_end || !activity_title?.trim()) {
      return error(res, 'Date, time, and activity title are required', 400);
    }

    const startDateTime = new Date(`${date_needed}T${time_start}:00`);
    const endDateTime   = new Date(`${date_needed}T${time_end}:00`);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return error(res, 'Invalid date or time format', 400);
    }
    if (endDateTime <= startDateTime) {
      return error(res, 'End time must be after start time', 400);
    }

    // Resolve member identifiers -> user_ids
    const validMemberIds = [];
    for (const identifier of member_ids) {
      if (!identifier) continue;
      const student = await prisma.user.findFirst({
        where: {
          OR: [
            { student_number: String(identifier).trim() },
            { user_id: isNaN(identifier) ? undefined : parseInt(identifier) }
          ]
        },
        select: { user_id: true }
      });
      if (student && student.user_id !== userId) validMemberIds.push(student.user_id);
    }

    const reservation = await prisma.reservation.create({
      data: {
        reserving_student: userId,
        group_number:      group_number?.trim() || null,
        date_needed:       new Date(date_needed),
        time_start:        startDateTime,
        time_end:          endDateTime,
        activity_title:    activity_title.trim(),
        conditions_note:   conditions_note?.trim() || null,
        status:            'TO_REVIEW',
        members: { create: validMemberIds.map(sid => ({ student_id: sid })) },
        items: {
          create: items
            .filter(i => i.item_id && !isNaN(i.item_id))
            .map(i => ({ item_id: parseInt(i.item_id), quantity: parseInt(i.quantity) || 1 }))
        }
      },
      include: {
        reservingStudent: true,
        members:          true,
        items:            { include: { item: true } }
      }
    });

    success(res, reservation, 'Reservation request submitted successfully!', 201);
  } catch (err) {
    console.error('Create Reservation Error:', err);
    error(res, 'Failed to create reservation', 500, err.message);
  }
};

/**
 * GET /api/reservations/:id
 * Detail view — owner, member, or staff/admin.
 */
exports.getReservationById = async (req, res) => {
  try {
    const { id }  = req.params;
    const userId  = req.user.user_id;
    const isStaff = req.user.user_type !== 'STUDENT';

    const reservation = await prisma.reservation.findUnique({
      where: { reservation_id: parseInt(id) },
      include: {
        reservingStudent: true,
        members:          { include: { student: true } },
        items:            { include: { item: true } }
      }
    });

    if (!reservation) return error(res, 'Reservation not found', 404);

    const isOwner  = reservation.reserving_student === userId;
    const isMember = reservation.members.some(m => m.student_id === userId);
    if (!isOwner && !isMember && !isStaff) return error(res, 'Access denied', 403);

    success(res, reservation);
  } catch (err) {
    console.error('Get Reservation By ID Error:', err);
    error(res, 'Failed to fetch reservation', 500);
  }
};

/**
 * PATCH /api/reservations/:id/status
 * Admin / Staff only.
 * Body: { status: 'ALLOWED'|'REJECTED'|'CONDITIONAL', rejection_reason?, conditions_note? }
 *
 * The admin UI uses these status labels:
 *   TO_REVIEW  → "Pending Approval" tab
 *   ALLOWED    → "Active" in Active Reservations (shown as "active")
 *   CONDITIONAL → "Conditional"
 *   REJECTED   → removed from active view
 */
exports.updateReservationStatus = async (req, res) => {
  try {
    const { id }      = req.params;
    const actorType   = req.user.user_type;

    if (actorType === 'STUDENT') return error(res, 'Insufficient permissions', 403);

    const VALID = ['ALLOWED', 'REJECTED', 'CONDITIONAL'];
    const { status, rejection_reason, conditions_note } = req.body;

    if (!status || !VALID.includes(status)) {
      return error(res, `status must be one of: ${VALID.join(', ')}`, 400);
    }

    const existing = await prisma.reservation.findUnique({
      where: { reservation_id: parseInt(id) }
    });
    if (!existing) return error(res, 'Reservation not found', 404);

    const updateData = { status };
    if (status === 'REJECTED'    && rejection_reason?.trim()) updateData.rejection_reason = rejection_reason.trim();
    if (status === 'CONDITIONAL' && conditions_note?.trim())  updateData.conditions_note  = conditions_note.trim();

    const updated = await prisma.reservation.update({
      where: { reservation_id: parseInt(id) },
      data:  updateData,
      include: {
        reservingStudent: { select: { first_name: true, last_name: true, student_number: true } },
        members:          { include: { student: { select: { first_name: true, last_name: true } } } },
        items:            { include: { item: { select: { name: true, unit: true } } } }
      }
    });

    // Fire-and-forget activity log
    prisma.activityLog.create({
      data: {
        actor_id:     req.user.user_id,
        action:       `Reservation ${status}`,
        target_table: 'reservations',
        target_id:    parseInt(id),
        details:      { previous_status: existing.status, new_status: status }
      }
    }).catch(() => {});

    success(res, updated, `Reservation ${status.toLowerCase()} successfully`);
  } catch (err) {
    console.error('Update Reservation Status Error:', err);
    error(res, 'Failed to update reservation status', 500);
  }
};
