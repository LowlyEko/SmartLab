// controllers/reservationController.js
const prisma = require('../config/prisma');
const { success, error } = require('../utils/response');
const { sendProfessorNotification } = require('../utils/mailer');

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
      email:      true,
      college:    true,
      year_level: true,
      section:    true,
    },
  },
  members: {
    select: { member_id: true, name: true },
  },
  accountabilities: {
    select: {
      accountability_id: true,
      materials_broken:  true,
      resolved:          true,
      remarks:           true,
    },
  },
  reservation_apparatus: {
    select: {
      id:           true,
      apparatus_id: true,
      quantity:     true,
      inventory_apparatus: { select: { apparatus_name: true } },
    },
  },
  reservation_equipment: {
    select: {
      id:           true,
      equipment_id: true,
      quantity:     true,
      inventory_equipment: { select: { equipment_name: true } },
    },
  },
  reservation_glassware: {
    select: {
      id:           true,
      glassware_id: true,
      quantity:     true,
      inventory_glassware: { select: { glassware: true } },
    },
  },
  reservation_supplies: {
    select: {
      id:          true,
      supplies_id: true,
      quantity:    true,
      inventory_supplies: { select: { supplies_name: true } },
    },
  },
  chemical_items: {
    include: {
      chemical: {
        select: {
          chemical_id:    true,
          chemical_name:  true,
          quantity:       true,
          container_size: true,
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

    // Auto-flag overdue: bulk-update all Approved reservations whose
    // due_date (date_borrowed + 1 day) has passed without being returned.
    // Single UPDATE query — no per-row loop.
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    await prisma.reservation.updateMany({
      where: {
        status:   'Approved',
        due_date: { lt: todayMidnight },
        // Scope to this student when relevant so we only touch their rows
        ...(isStudent ? { student_id: studentId } : {}),
      },
      data: { status: 'Invalid' },
    });

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
 * Helper — parse and validate a time string "HH:MM" or "HH:MM:SS".
 * Returns a Date object (1970-01-01T...) or null if the input is falsy.
 * Throws a plain Error with a user-friendly message on bad input.
 */
function parseTime(value, fieldName) {
  if (!value) return null;
  const d = new Date(`1970-01-01T${value}`);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid ${fieldName} format. Expected HH:MM or HH:MM:SS.`);
  }
  return d;
}

/**
 * Helper — parse and validate a date string.
 * Returns a Date object or throws on bad / out-of-range input.
 */
function parseDate(value, fieldName, fallbackToNow = false) {
  if (!value) {
    if (fallbackToNow) return new Date();
    throw new Error(`${fieldName} is required`);
  }
  const d = new Date(value);
  if (isNaN(d.getTime()) || d.getFullYear() < 2000 || d.getFullYear() > 2100) {
    throw new Error(`Invalid ${fieldName}. Please enter a valid date between 2000 and 2100.`);
  }
  return d;
}

/**
 * POST /api/reservations
 * Body: {
 *   subject, prof_name, prof_email,
 *   date_borrowed, date_reserved?,
 *   time_start, time_end,
 *   course_year_section?, group_number?, type,
 *   members:   [{ name }],
 *   equipment: [{ equipment_id, quantity, remarks? }],
 *   chemicals: [{ chemical_id, quantity, remarks? }]
 * }
 */
exports.createReservation = async (req, res) => {
  try {
    const studentId = req.user.student_id;
    if (!studentId) {
      return error(res, 'Your student ID has not been assigned yet. Please contact the administrator.', 400);
    }

    const {
      subject,
      prof_name,
      prof_email,
      date_borrowed,
      date_reserved,
      time_start,
      time_end,
      course_year_section,
      group_number,
      type,
      equipment_log,
      members   = [],
      equipment = [],
      chemicals = [],
    } = req.body;

    // ── Required field checks ──────────────────────────────────────────────
    if (!subject?.trim())  return error(res, 'Subject is required', 400);
    if (!date_borrowed)    return error(res, 'date_borrowed is required', 400);
    if (!time_start)       return error(res, 'time_start is required', 400);
    if (!time_end)         return error(res, 'time_end is required', 400);
    if (!type?.trim())     return error(res, 'type is required', 400);

    // ── Date / time parsing ────────────────────────────────────────────────
    let parsedDateBorrowed, parsedDateReserved, parsedTimeStart, parsedTimeEnd;
    try {
      parsedDateBorrowed = parseDate(date_borrowed,  'date_borrowed');
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm   = String(now.getMonth() + 1).padStart(2, '0');
      const dd   = String(now.getDate()).padStart(2, '0');
      parsedDateReserved = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
      parsedTimeStart    = parseTime(time_start, 'time_start');
      parsedTimeEnd      = parseTime(time_end,   'time_end');
    } catch (validationErr) {
      return error(res, validationErr.message, 400);
    }


    // ── Accountability block ───────────────────────────────────────────────
    // Students with unresolved accountability records cannot make new
    // reservations until their accountability is settled.
    const pendingAccountability = await prisma.accountability.findFirst({
      where: { student_id: studentId, resolved: false },
      select: { accountability_id: true },
    });
    if (pendingAccountability) {
      return error(
        res,
        'You have an unresolved accountability record. Please settle it before making a new reservation.',
        403
      );
    }

    // ── Persist ───────────────────────────────────────────────────────────
    console.log('[CREATE] equipment payload:', JSON.stringify(equipment));
    const reservation = await prisma.reservation.create({
      data: {
        student_id:          studentId,
        subject:             subject.trim(),
        prof_name:           prof_name?.trim()           || null,
        prof_email:          prof_email?.trim()          || null,
        date_reserved:       parsedDateReserved,
        date_borrowed:       parsedDateBorrowed,
        time_start:          parsedTimeStart,
        time_end:            parsedTimeEnd,
        course_year_section: course_year_section?.trim() || null,
        group_number:        group_number ? parseInt(group_number) : null,
        type:                type.trim(),
        equipment_log:       equipment_log ? equipment_log.trim() : null,
        status:              'Pending',
        members: {
          create: members
            .filter(m => m?.name?.trim())
            .map(m => ({ name: m.name.trim() })),
        },
        reservation_apparatus: {
          create: equipment
            .filter(e => e?.item_type === 'apparatus' && e?.item_id)
            .map(e => ({ apparatus_id: BigInt(e.item_id), quantity: parseInt(e.quantity) || 1, remarks: e.remarks?.trim() || null })),
        },
        reservation_equipment: {
          create: equipment
            .filter(e => e?.item_type === 'equipment' && e?.item_id)
            .map(e => ({ equipment_id: BigInt(e.item_id), quantity: parseInt(e.quantity) || 1, remarks: e.remarks?.trim() || null })),
        },
        reservation_glassware: {
          create: equipment
            .filter(e => e?.item_type === 'glassware' && e?.item_id)
            .map(e => ({ glassware_id: BigInt(e.item_id), quantity: parseInt(e.quantity) || 1, remarks: e.remarks?.trim() || null })),
        },
        reservation_supplies: {
          create: equipment
            .filter(e => e?.item_type === 'supplies' && e?.item_id)
            .map(e => ({ supplies_id: BigInt(e.item_id), quantity: parseInt(e.quantity) || 1, remarks: e.remarks?.trim() || null })),
        },
        chemical_items: {
          create: chemicals
            .filter(c => c?.chemical_id)
            .map(c => ({
              chemical_id: BigInt(c.chemical_id),
              quantity:    parseInt(c.quantity) || 1,
              remarks:     c.remarks?.trim()    || null,
            })),
        },
      },
      include: FULL_INCLUDE,
    });

    // ── Auto-Conditional: set status to Conditional if any requested item has quantity 0 ──
    // Conditional means the admin will arrange peer-borrowing or alternative sourcing.
    let hasZeroStockItem = false;

    const chemicalIds  = chemicals.filter(c => c?.chemical_id).map(c => BigInt(c.chemical_id));
    const apparatusIds = equipment.filter(e => e?.item_type === 'apparatus' && e?.item_id).map(e => BigInt(e.item_id));
    const equipmentIds = equipment.filter(e => e?.item_type === 'equipment' && e?.item_id).map(e => BigInt(e.item_id));
    const glasswareIds = equipment.filter(e => e?.item_type === 'glassware' && e?.item_id).map(e => BigInt(e.item_id));
    const suppliesIds  = equipment.filter(e => e?.item_type === 'supplies'  && e?.item_id).map(e => BigInt(e.item_id));

    if (!hasZeroStockItem && chemicalIds.length) {
      const zeroChemical = await prisma.inventoryChemical.findFirst({
        where: { chemical_id: { in: chemicalIds }, quantity: 0 },
        select: { chemical_id: true },
      });
      if (zeroChemical) hasZeroStockItem = true;
    }
    if (!hasZeroStockItem && apparatusIds.length) {
      const zeroApparatus = await prisma.inventoryApparatus.findFirst({
        where: { apparatus_id: { in: apparatusIds }, quantity: 0 },
        select: { apparatus_id: true },
      });
      if (zeroApparatus) hasZeroStockItem = true;
    }
    if (!hasZeroStockItem && equipmentIds.length) {
      const zeroEquipment = await prisma.inventoryEquipment.findFirst({
        where: { equipment_id: { in: equipmentIds }, quantity: 0 },
        select: { equipment_id: true },
      });
      if (zeroEquipment) hasZeroStockItem = true;
    }
    if (!hasZeroStockItem && glasswareIds.length) {
      const zeroGlassware = await prisma.inventoryGlassware.findFirst({
        where: { glassware_id: { in: glasswareIds }, quantity: 0 },
        select: { glassware_id: true },
      });
      if (zeroGlassware) hasZeroStockItem = true;
    }
    if (!hasZeroStockItem && suppliesIds.length) {
      const zeroSupplies = await prisma.inventorySupplies.findFirst({
        where: { supplies_id: { in: suppliesIds }, quantity: 0 },
        select: { supplies_id: true },
      });
      if (zeroSupplies) hasZeroStockItem = true;
    }

    if (hasZeroStockItem) {
      await prisma.reservation.update({
        where: { reservation_id: reservation.reservation_id },
        data: {
          status: 'Conditional',
          conditional_remarks: 'One or more requested items are currently out of stock. The admin will arrange borrowing from other students or an alternative source.',
        },
      });
      reservation.status = 'Conditional';
      reservation.conditional_remarks = 'One or more requested items are currently out of stock. The admin will arrange borrowing from other students or an alternative source.';
      console.log(`[CONDITIONAL] Reservation ${reservation.reservation_id} auto-set to Conditional due to zero-stock item(s).`);
    }

    success(res, reservation, 'Reservation submitted successfully!', 201);

    // Send professor notification email (non-blocking — fires after response)
    sendProfessorNotification(reservation, reservation.student, prisma).catch(err =>
      console.error('[MAILER] Professor notification failed:', err.message)
    );
  } catch (err) {
    console.error('Create Reservation Error:', err);
    error(res, 'Failed to create reservation', 500, err.message);
  }
};

/**
 * PUT /api/reservations/:id
 * Students can edit their own Pending reservations only.
 * Body: same shape as POST (minus members/equipment/chemicals which are replaced wholesale).
 */
exports.updateReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const reservationId = parseInt(id);

    const existing = await prisma.reservation.findUnique({
      where: { reservation_id: reservationId },
    });
    if (!existing) return error(res, 'Reservation not found', 404);

    // Only the owner can edit, and only while Pending
    const isOwner = existing.student_id === req.user.student_id;
    if (!isOwner) return error(res, 'Access denied', 403);

    const isPending = ['Pending', 'TO_REVIEW', 'pending', 'to_review'].includes(existing.status);
    if (!isPending) return error(res, 'Only pending reservations can be edited', 400);

    const {
      subject,
      prof_name,
      prof_email,
      date_borrowed,
      date_reserved,
      time_start,
      time_end,
      course_year_section,
      group_number,
      type,
      notes,
      equipment_log,
      members   = [],
      equipment = [],
      chemicals = [],
    } = req.body;

    // ── Validation ─────────────────────────────────────────────────────────
    if (!subject?.trim())  return error(res, 'Subject is required', 400);
    if (!date_borrowed)    return error(res, 'date_borrowed is required', 400);
    if (!time_start)       return error(res, 'time_start is required', 400);
    if (!time_end)         return error(res, 'time_end is required', 400);
    if (!type?.trim())     return error(res, 'type is required', 400);

    let parsedDateBorrowed, parsedDateReserved, parsedTimeStart, parsedTimeEnd;
    try {
      parsedDateBorrowed = parseDate(date_borrowed, 'date_borrowed');
     const now = new Date();
      const yyyy = now.getFullYear();
      const mm   = String(now.getMonth() + 1).padStart(2, '0');
      const dd   = String(now.getDate()).padStart(2, '0');
      parsedDateReserved = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
      parsedTimeStart    = parseTime(time_start, 'time_start');
      parsedTimeEnd      = parseTime(time_end,   'time_end');
    } catch (validationErr) {
      return error(res, validationErr.message, 400);
    }

    // ── Update — delete child rows first, then recreate ───────────────────
    const updated = await prisma.$transaction(async (tx) => {
      // Delete existing child rows
      await tx.reservationMember.deleteMany({     where: { reservation_id: reservationId } });
      await tx.reservation_apparatus.deleteMany({ where: { reservation_id: reservationId } });
      await tx.reservation_equipment.deleteMany({ where: { reservation_id: reservationId } });
      await tx.reservation_glassware.deleteMany({ where: { reservation_id: reservationId } });
      await tx.reservation_supplies.deleteMany({  where: { reservation_id: reservationId } });
      await tx.reservationChemical.deleteMany({   where: { reservation_id: reservationId } });

      // Update parent and recreate children
      return tx.reservation.update({
        where: { reservation_id: reservationId },
        data: {
          subject:             subject.trim(),
          prof_name:           prof_name?.trim()           || null,
          prof_email:          prof_email?.trim()          || null,
          date_reserved:       parsedDateReserved,
          date_borrowed:       parsedDateBorrowed,
          time_start:          parsedTimeStart,
          time_end:            parsedTimeEnd,
          course_year_section: course_year_section?.trim() || null,
          group_number:        group_number ? parseInt(group_number) : null,
          type:                type.trim(),
          equipment_log:       equipment_log ? equipment_log.trim() : null,
          members: {
            create: members.filter(m => m?.name?.trim()).map(m => ({ name: m.name.trim() })),
          },
          reservation_apparatus: {
            create: equipment
              .filter(e => e?.item_type === 'apparatus' && e?.item_id)
              .map(e => ({ apparatus_id: BigInt(e.item_id), quantity: parseInt(e.quantity) || 1, remarks: e.remarks?.trim() || null })),
          },
          reservation_equipment: {
            create: equipment
              .filter(e => e?.item_type === 'equipment' && e?.item_id)
              .map(e => ({ equipment_id: BigInt(e.item_id), quantity: parseInt(e.quantity) || 1, remarks: e.remarks?.trim() || null })),
          },
          reservation_glassware: {
            create: equipment
              .filter(e => e?.item_type === 'glassware' && e?.item_id)
              .map(e => ({ glassware_id: BigInt(e.item_id), quantity: parseInt(e.quantity) || 1, remarks: e.remarks?.trim() || null })),
          },
          reservation_supplies: {
            create: equipment
              .filter(e => e?.item_type === 'supplies' && e?.item_id)
              .map(e => ({ supplies_id: BigInt(e.item_id), quantity: parseInt(e.quantity) || 1, remarks: e.remarks?.trim() || null })),
          },
          chemical_items: {
            create: chemicals
              .filter(c => c?.chemical_id)
              .map(c => ({ chemical_id: BigInt(c.chemical_id), quantity: parseInt(c.quantity) || 1, remarks: c.remarks?.trim() || null })),
          },
        },
        include: FULL_INCLUDE,
      });
    });

    success(res, updated, 'Reservation updated successfully');
  } catch (err) {
    console.error('Update Reservation Error:', err);
    error(res, 'Failed to update reservation', 500, err.message);
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
    const reservationId = parseInt(id);
    const actorType = req.user.user_type;

    if (actorType === 'STUDENT') return error(res, 'Insufficient permissions', 403);

    const VALID = ['Approved', 'Conditional', 'Pending', 'Returned', 'Rejected', 'Invalid'];
    const { status, conditional_remarks } = req.body;

    if (!status || !VALID.includes(status))
      return error(res, `status must be one of: ${VALID.join(', ')}`, 400);

    if (status === 'Conditional' && !conditional_remarks?.trim())
      return error(res, 'conditional_remarks is required when status is Conditional', 400);

    // Fetch existing reservation WITH all line items so we can deduct inventory
    const existing = await prisma.reservation.findUnique({
      where:   { reservation_id: reservationId },
      include: FULL_INCLUDE,
    });
    if (!existing) return error(res, 'Reservation not found', 404);

    // Prevent double-deduction: only deduct when transitioning INTO Approved
    const wasAlreadyApproved = existing.status === 'Approved';
    const isApproving        = status === 'Approved' && !wasAlreadyApproved;

    // Restore inventory only when transitioning INTO Returned from Approved.
    // Conditional reservations use peer-borrowing (qty was 0 at request time),
    // so nothing was deducted from stock — don't restore those.
    const wasAlreadyReturned = existing.status === 'Returned';
    const isReturning        = status === 'Returned' && !wasAlreadyReturned && (wasAlreadyApproved || existing.status === 'Invalid');

    // Build update data
    const updateData = {
      status,
      admin: req.user.user_id
        ? { connect: { admin_id: req.user.user_id } }
        : undefined,
      signed_by: status === 'Approved' && req.user.user_id
        ? { connect: { admin_id: req.user.user_id } }
        : { disconnect: true },
    };

    // Auto-set due_date = date_borrowed + 1 day when approving for the first time
    if (isApproving && existing.date_borrowed) {
      const due = new Date(existing.date_borrowed);
      due.setDate(due.getDate() + 1);
      updateData.due_date = due;
    }

    // Auto-set date_returned = today when marking as Returned
    if (isReturning) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      updateData.date_returned = today;
    }

    if (status === 'Conditional' && conditional_remarks?.trim()) {
      updateData.conditional_remarks = conditional_remarks.trim();
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update reservation status
      const result = await tx.reservation.update({
        where:   { reservation_id: reservationId },
        data:    updateData,
        include: FULL_INCLUDE,
      });

      // 2. Deduct inventory only when approving for the first time.
      //    Skip items with current qty <= 0 — those are peer-borrowed (Conditional)
      //    and were never in stock; deducting them would push qty negative.
      if (isApproving) {
        // Chemicals
        for (const item of existing.chemical_items || []) {
          if (!item.chemical_id) continue;
          const inv = await tx.inventoryChemical.findUnique({ where: { chemical_id: BigInt(item.chemical_id) } });
          if (!inv || inv.quantity <= 0) continue; // peer-borrowed, nothing to deduct
          await tx.inventoryChemical.update({
            where: { chemical_id: BigInt(item.chemical_id) },
            data:  { quantity: { decrement: item.quantity } },
          });
        }
        // Apparatus
        for (const item of existing.reservation_apparatus || []) {
          if (!item.apparatus_id) continue;
          const inv = await tx.inventoryApparatus.findUnique({ where: { apparatus_id: BigInt(item.apparatus_id) } });
          if (!inv || inv.quantity <= 0) continue;
          await tx.inventoryApparatus.update({
            where: { apparatus_id: BigInt(item.apparatus_id) },
            data:  { quantity: { decrement: item.quantity } },
          });
        }
        // Equipment
        for (const item of existing.reservation_equipment || []) {
          if (!item.equipment_id) continue;
          const inv = await tx.inventoryEquipment.findUnique({ where: { equipment_id: BigInt(item.equipment_id) } });
          if (!inv || inv.quantity <= 0) continue;
          await tx.inventoryEquipment.update({
            where: { equipment_id: BigInt(item.equipment_id) },
            data:  { quantity: { decrement: item.quantity } },
          });
        }
        // Glassware
        for (const item of existing.reservation_glassware || []) {
          if (!item.glassware_id) continue;
          const inv = await tx.inventoryGlassware.findUnique({ where: { glassware_id: BigInt(item.glassware_id) } });
          if (!inv || inv.quantity <= 0) continue;
          await tx.inventoryGlassware.update({
            where: { glassware_id: BigInt(item.glassware_id) },
            data:  { quantity: { decrement: item.quantity } },
          });
        }
        // Supplies
        for (const item of existing.reservation_supplies || []) {
          if (!item.supplies_id) continue;
          const inv = await tx.inventorySupplies.findUnique({ where: { supplies_id: BigInt(item.supplies_id) } });
          if (!inv || inv.quantity <= 0) continue;
          await tx.inventorySupplies.update({
            where: { supplies_id: BigInt(item.supplies_id) },
            data:  { quantity: { decrement: item.quantity } },
          });
        }

        console.log(`[INVENTORY] Deducted quantities for reservation ${reservationId} on approval.`);
      }

      // 3. Restore inventory when marked Returned.
      //    Only restore items with qty >= 0 — negative means it was peer-borrowed
      //    (qty was 0 at approval, nothing was deducted from stock).
      if (isReturning) {
        // Chemicals
        for (const item of existing.chemical_items || []) {
          if (!item.chemical_id) continue;
          const inv = await tx.inventoryChemical.findUnique({ where: { chemical_id: BigInt(item.chemical_id) } });
          if (!inv || inv.quantity < 0) continue; // peer-borrowed at approval, skip
          await tx.inventoryChemical.update({
            where: { chemical_id: BigInt(item.chemical_id) },
            data:  { quantity: { increment: item.quantity } },
          });
        }
        // Apparatus
        for (const item of existing.reservation_apparatus || []) {
          if (!item.apparatus_id) continue;
          const inv = await tx.inventoryApparatus.findUnique({ where: { apparatus_id: BigInt(item.apparatus_id) } });
          if (!inv || inv.quantity < 0) continue;
          await tx.inventoryApparatus.update({
            where: { apparatus_id: BigInt(item.apparatus_id) },
            data:  { quantity: { increment: item.quantity } },
          });
        }
        // Equipment
        for (const item of existing.reservation_equipment || []) {
          if (!item.equipment_id) continue;
          const inv = await tx.inventoryEquipment.findUnique({ where: { equipment_id: BigInt(item.equipment_id) } });
          if (!inv || inv.quantity < 0) continue;
          await tx.inventoryEquipment.update({
            where: { equipment_id: BigInt(item.equipment_id) },
            data:  { quantity: { increment: item.quantity } },
          });
        }
        // Glassware
        for (const item of existing.reservation_glassware || []) {
          if (!item.glassware_id) continue;
          const inv = await tx.inventoryGlassware.findUnique({ where: { glassware_id: BigInt(item.glassware_id) } });
          if (!inv || inv.quantity < 0) continue;
          await tx.inventoryGlassware.update({
            where: { glassware_id: BigInt(item.glassware_id) },
            data:  { quantity: { increment: item.quantity } },
          });
        }
        // Supplies
        for (const item of existing.reservation_supplies || []) {
          if (!item.supplies_id) continue;
          const inv = await tx.inventorySupplies.findUnique({ where: { supplies_id: BigInt(item.supplies_id) } });
          if (!inv || inv.quantity < 0) continue;
          await tx.inventorySupplies.update({
            where: { supplies_id: BigInt(item.supplies_id) },
            data:  { quantity: { increment: item.quantity } },
          });
        }

        console.log(`[INVENTORY] Restored quantities for reservation ${reservationId} on return.`);
      }

      return result;
    });

    success(res, updated, `Reservation ${status.toLowerCase()} successfully`);
  } catch (err) {
    console.error('Update Reservation Status Error:', err);
    error(res, 'Failed to update reservation status', 500);
  }
};
// ============================================================
//  ADMIN EDIT — PATCH /api/reservations/:id/admin-edit
//  Allows staff to update status, conditional_remarks, and
//  date_borrowed without touching inventory or items.
// ============================================================
exports.adminEditReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const reservationId = parseInt(id);

    if (req.user.user_type === 'STUDENT')
      return error(res, 'Insufficient permissions', 403);

    const VALID = ['Approved', 'Conditional', 'Pending', 'Returned', 'Rejected', 'Invalid'];
    const { status, conditional_remarks, date_borrowed } = req.body;

    if (status && !VALID.includes(status))
      return error(res, `status must be one of: ${VALID.join(', ')}`, 400);

    if (status === 'Conditional' && !conditional_remarks?.trim())
      return error(res, 'conditional_remarks is required when status is Conditional', 400);

    const existing = await prisma.reservation.findUnique({
      where: { reservation_id: reservationId },
    });
    if (!existing) return error(res, 'Reservation not found', 404);

    const updateData = {};
    if (status)               updateData.status               = status;
    if (conditional_remarks !== undefined) updateData.conditional_remarks = conditional_remarks;
    if (date_borrowed)        updateData.date_borrowed         = new Date(date_borrowed);

    const updated = await prisma.reservation.update({
      where: { reservation_id: reservationId },
      data:  updateData,
    });

    success(res, updated, 'Reservation updated successfully');
  } catch (err) {
    console.error('Admin Edit Reservation Error:', err);
    error(res, 'Failed to update reservation.');
  }
};
/**
 * GET /api/reservations/prof-signoff?token=XXX
 * Public (no auth) — called when the professor clicks the sign-off link in their email.
 * Matches the same pattern as accountability-signoff.
 */
exports.professorSignOff = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) return error(res, 'Invalid sign-off link.', 400);

    const reservation = await prisma.reservation.findUnique({
      where:  { prof_token: token },
      select: { reservation_id: true, prof_approved_at: true, subject: true },
    });

    if (!reservation) return error(res, 'Sign-off link is invalid or has already been used.', 404);

    if (reservation.prof_approved_at) {
      return error(res, 'This reservation has already been signed off by the professor.', 400);
    }

    await prisma.reservation.update({
      where: { reservation_id: reservation.reservation_id },
      data: {
        prof_approved_at: new Date(),
        prof_token:       null,   // invalidate so link cannot be reused
      },
    });

    console.log(`[PROF-SIGNOFF] Reservation ${reservation.reservation_id} signed off by professor`);

    res.json({
      success: true,
      message: 'Thank you! Your sign-off has been recorded. The SmartLab staff has been notified.',
    });
  } catch (err) {
    console.error('Professor Sign-Off Error:', err);
    error(res, 'An error occurred. Please try again or contact the lab admin.', 500);
  }
};