// controllers/reservationController.js
const { PrismaClient } = require('@prisma/client');
const { success, error } = require('../utils/response');
const prisma = new PrismaClient();

// ==================== STUDENT ENDPOINTS ====================

exports.getMyReservations = async (req, res) => {
  try {
    const reservations = await prisma.reservation.findMany({
      where: {
        OR: [
          { reserving_student: req.user.user_id },
          { members: { some: { student_id: req.user.user_id } } }
        ]
      },
      include: {
        reservingStudent: { select: { first_name: true, last_name: true, student_number: true } },
        items: { include: { item: true } }
      },
      orderBy: { date_needed: 'desc' }
    });
    success(res, reservations);
  } catch (err) {
    error(res, err.message);
  }
};

exports.createReservation = async (req, res) => {
  try {
    const { date_needed, time_start, time_end, activity_title, items = [] } = req.body;
    const userId = req.user.user_id;

    if (!date_needed || !time_start || !time_end || !activity_title) {
      return error(res, "Date needed, time, and activity title are required", 400);
    }

    const reservation = await prisma.reservation.create({
      data: {
        reserving_student: userId,
        date_needed: new Date(date_needed),
        time_start: new Date(`${date_needed}T${time_start}`),
        time_end: new Date(`${date_needed}T${time_end}`),
        activity_title,
        status: 'TO_REVIEW',
        items: {
          create: items.map(item => ({
            item_id: parseInt(item.item_id),
            quantity: parseInt(item.quantity) || 1
          }))
        }
      },
      include: {
        items: { include: { item: true } }
      }
    });

    success(res, reservation, "Reservation submitted successfully! Waiting for staff approval.", 201);
  } catch (err) {
    console.error(err);
    error(res, err.message);
  }
};

// ==================== STAFF ENDPOINTS ====================

exports.getAllReservations = async (req, res) => {
  try {
    const reservations = await prisma.reservation.findMany({
      include: {
        reservingStudent: true,
        members: true,
        items: { include: { item: true } }
      },
      orderBy: { date_needed: 'desc' }
    });
    success(res, reservations);
  } catch (err) {
    error(res, err.message);
  }
};

exports.updateReservationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason, conditions_note } = req.body;

    const reservation = await prisma.reservation.update({
      where: { reservation_id: parseInt(id) },
      data: {
        status,
        rejection_reason: status === 'REJECTED' ? rejection_reason : null,
        conditions_note: status === 'CONDITIONAL' ? conditions_note : null
      }
    });

    success(res, reservation, `Reservation ${status.toLowerCase()} successfully`);
  } catch (err) {
    error(res, err.message);
  }
};