const prisma = require('../config/prisma');
const { success, error } = require('../utils/response');
/**
 * GET /api/reservations
 * Fetch reservations based on user role and schema field names
 */
exports.getAllReservations = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const isStudent = req.user.user_type === 'STUDENT';

    // Students see reservations they own or are members of
    const whereClause = isStudent ? {
      OR: [
        { reserving_student: userId },
        { members: { some: { student_id: userId } } }
      ]
    } : {};

    const reservations = await prisma.reservation.findMany({
      where: whereClause,
      include: {
        reservingStudent: {
          select: { first_name: true, last_name: true, student_number: true }
        },
        members: {
          include: {
            student: {
              select: { first_name: true, last_name: true, student_number: true }
            }
          }
        },
        items: {
          include: {
            item: {
              select: { name: true, category: true, unit: true }
            }
          }
        }
      },
      orderBy: { date_needed: 'desc' }
    });

    success(res, reservations, "Reservations fetched successfully");
  } catch (err) {
    console.error('Get Reservations Error:', err);
    error(res, "Failed to fetch reservations", 500);
  }
};

/**
 * POST /api/reservations
 * Create a new reservation with members and items
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
      items = [],
      member_ids = []
    } = req.body;

    // 1. Validation
    if (!date_needed || !time_start || !time_end || !activity_title?.trim()) {
      return error(res, "Date, time, and activity title are required", 400);
    }

    // 2. Format Dates (Combining date and time strings for Prisma DateTime)
    const startDateTime = new Date(`${date_needed}T${time_start}:00`);
    const endDateTime = new Date(`${date_needed}T${time_end}:00`);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return error(res, "Invalid date or time format", 400);
    }

    if (endDateTime <= startDateTime) {
      return error(res, "End time must be after start time", 400);
    }

    // 3. Resolve member student_numbers -> user_ids
    const validMemberIds = [];
    for (const identifier of member_ids) {
      if (!identifier) continue;
      // Try lookup by student_number first, then by numeric user_id as fallback
      const student = await prisma.user.findFirst({
        where: {
          OR: [
            { student_number: String(identifier).trim() },
            { user_id: isNaN(identifier) ? undefined : parseInt(identifier) }
          ]
        },
        select: { user_id: true }
      });
      if (student && student.user_id !== userId) {
        validMemberIds.push(student.user_id);
      }
    }

    // 4. Database Insertion
    const reservation = await prisma.reservation.create({
      data: {
        reserving_student: userId,
        group_number: group_number?.trim() || null,
        date_needed: new Date(date_needed),
        time_start: startDateTime,
        time_end: endDateTime,
        activity_title: activity_title.trim(),
        conditions_note: conditions_note?.trim() || null,
        status: 'TO_REVIEW',

        // Map resolved member user_ids
        members: {
          create: validMemberIds.map(student_id => ({ student_id }))
        },

        // Map items (only those with a valid inventory item_id)
        items: {
          create: items
            .filter(item => item.item_id && !isNaN(item.item_id))
            .map(item => ({
              item_id: parseInt(item.item_id),
              quantity: parseInt(item.quantity) || 1
            }))
        }
      },
      include: {
        reservingStudent: true,
        members: true,
        items: { include: { item: true } }
      }
    });

    success(res, reservation, "Reservation request submitted successfully!", 201);

  } catch (err) {
    console.error('Create Reservation Error:', err);
    error(res, "Failed to create reservation", 500, err.message);
  }
};

/**
 * GET /api/reservations/:id
 * Retrieve a specific reservation with permission check
 */
exports.getReservationById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    const isStaff = req.user.user_type !== 'STUDENT';

    const reservation = await prisma.reservation.findUnique({
      where: { reservation_id: parseInt(id) },
      include: {
        reservingStudent: true,
        members: { include: { student: true } },
        items: { include: { item: true } }
      }
    });

    if (!reservation) return error(res, "Reservation not found", 404);

    // Permission check: Owner, Member, or Admin/Staff
    const isOwner = reservation.reserving_student === userId;
    const isMember = reservation.members.some(m => m.student_id === userId);

    if (!isOwner && !isMember && !isStaff) {
      return error(res, "Access denied", 403);
    }

    success(res, reservation);
  } catch (err) {
    console.error('Get Reservation By ID Error:', err);
    error(res, "Failed to fetch reservation", 500);
  }
};