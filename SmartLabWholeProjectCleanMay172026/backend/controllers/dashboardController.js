// controllers/dashboardController.js
const prisma = require('../config/prisma');
const { success, error } = require('../utils/response');

exports.getStudentDashboard = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const [pending, approved, accountability, recentReservations] = await Promise.all([
      // Pending reservations by this student
      prisma.reservation.count({
        where: { reserving_student: userId, status: 'TO_REVIEW' }
      }),
      // Approved reservations by this student
      prisma.reservation.count({
        where: { reserving_student: userId, status: 'ALLOWED' }
      }),
      // Pending accountability records for this student
      prisma.accountability.count({
        where: { responsible_student: userId, resolution_status: 'PENDING' }
      }),
      // 3 most recent reservations for the upcoming list
      prisma.reservation.findMany({
        where: { reserving_student: userId },
        orderBy: { date_needed: 'asc' },
        take: 3,
        select: {
          reservation_id: true,
          activity_title: true,
          date_needed: true,
          time_start: true,
          time_end: true,
          status: true
        }
      })
    ]);

    success(res, {
      pendingReservations: pending,
      approvedReservations: approved,
      pendingAccountability: accountability,
      recentReservations
    });
  } catch (err) {
    error(res, err.message);
  }
};

exports.getStaffDashboard = async (req, res) => {
  try {
    const [totalEquipment, pendingRequests, damages, lowStock] = await Promise.all([
      // Total active inventory items
      prisma.inventoryItem.count({
        where: { is_active: true }
      }),
      // Reservations pending review
      prisma.reservation.count({
        where: { status: 'TO_REVIEW' }
      }),
      // Unresolved accountability/damage records
      prisma.accountability.count({
        where: { resolution_status: 'PENDING' }
      }),
      // Items with low stock (amount <= 5)
      prisma.inventoryItem.count({
        where: { is_active: true, amount: { lte: 5 } }
      })
    ]);

    success(res, {
      totalEquipment,
      pendingRequests,
      damages,
      lowStock
    });
  } catch (err) {
    error(res, err.message);
  }
};
