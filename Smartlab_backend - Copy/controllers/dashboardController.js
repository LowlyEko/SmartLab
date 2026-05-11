// controllers/dashboardController.js
const { PrismaClient } = require('@prisma/client');
const { success, error } = require('../utils/response');
const prisma = new PrismaClient();

exports.getStudentDashboard = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const stats = {
      pendingReservations: 0,
      approvedReservations: 0,
      pendingAccountability: 0
    };
    success(res, stats);
  } catch (err) {
    error(res, err.message);
  }
};

exports.getStaffDashboard = async (req, res) => {
  try {
    const stats = {
      totalEquipment: 0,
      pendingRequests: 0,
      damages: 0
    };
    success(res, stats);
  } catch (err) {
    error(res, err.message);
  }
};