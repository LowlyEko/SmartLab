// controllers/dashboardController.js
const prisma = require('../config/prisma');
const { success, error } = require('../utils/response');

/**
 * GET /api/dashboard/student
 * Summary cards + upcoming reservations for the logged-in student.
 */
exports.getStudentDashboard = async (req, res) => {
  try {
    const studentId = req.user.student_id; // varchar e.g. "2021-00123"

    const [pending, approved, recentReservations] = await Promise.all([
      // Reservations still waiting for review
      prisma.reservation.count({
        where: { student_id: studentId, status: 'Pending' },
      }),
      // Approved reservations
      prisma.reservation.count({
        where: { student_id: studentId, status: 'Approved' },
      }),
      // 3 upcoming reservations (nearest date_borrowed first)
      prisma.reservation.findMany({
        where:   { student_id: studentId },
        orderBy: { date_borrowed: 'asc' },
        take:    3,
        select: {
          reservation_id:   true,
          subject:          true,
          prof_name:        true,
          date_borrowed:    true,
          time_of_activity: true,
          status:           true,
        },
      }),
    ]);

    // Accountability records belonging to this student (unresolved = no date_replaced)
    const pendingAccountability = await prisma.accountability.count({
      where: { student_id: studentId, date_replaced: null },
    });

    success(res, {
      pendingReservations:  pending,
      approvedReservations: approved,
      pendingAccountability,
      recentReservations,
    });
  } catch (err) {
    error(res, err.message);
  }
};

/**
 * GET /api/dashboard/staff
 * Summary cards for staff/admin overview.
 */
exports.getStaffDashboard = async (req, res) => {
  try {
    const [
      apparatusCount,
      glasswareCount,
      equipmentCount,
      suppliesCount,
      chemicalCount,
      pendingRequests,
      damages,
    ] = await Promise.all([
      prisma.inventoryApparatus.count(),
      prisma.inventoryGlassware.count(),
      prisma.inventoryEquipment.count(),
      prisma.inventorySupplies.count(),
      prisma.inventoryChemical.count(),
      // Reservations pending review
      prisma.reservation.count({ where: { status: 'Pending' } }),
      // Accountability records not yet resolved (no date_replaced)
      prisma.accountability.count({ where: { date_replaced: null } }),
    ]);

    const totalEquipment = apparatusCount + glasswareCount + equipmentCount + suppliesCount;
    const totalChemicals = chemicalCount;

    success(res, {
      totalEquipment,
      totalChemicals,
      totalInventory: totalEquipment + totalChemicals,
      pendingRequests,
      damages,
    });
  } catch (err) {
    error(res, err.message);
  }
};