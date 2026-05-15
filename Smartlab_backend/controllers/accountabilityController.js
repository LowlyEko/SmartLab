// controllers/accountabilityController.js
const prisma = require('../config/prisma');
const { success, error } = require('../utils/response');
// ==================== STUDENT ENDPOINTS ====================

/**
 * Students can only see their own accountability records
 */
exports.getMyAccountability = async (req, res) => {
  try {
    const records = await prisma.accountability.findMany({
      where: {
        responsible_student: req.user.user_id
      },
      include: {
        item: true,
        reservation: {
          select: { activity_title: true, date_needed: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    success(res, records);
  } catch (err) {
    error(res, err.message);
  }
};

/**
 * Students can create new accountability records (e.g. report broken item)
 */
exports.createRecord = async (req, res) => {
  try {
    const { reservation_id, item_id, item_description, specifics, quantity_broken, date_time_broken } = req.body;

    if (!item_id || !item_description) {
      return error(res, "Item ID and description are required", 400);
    }

    const record = await prisma.accountability.create({
      data: {
        reservation_id: reservation_id ? parseInt(reservation_id) : null,
        responsible_student: req.user.user_id,
        item_id: parseInt(item_id),
        item_description,
        specifics,
        quantity_broken: parseInt(quantity_broken) || 1,
        date_time_broken: date_time_broken ? new Date(date_time_broken) : new Date(),
        resolution_status: 'PENDING'
      }
    });

    success(res, record, "Accountability record created successfully", 201);
  } catch (err) {
    console.error(err);
    error(res, err.message);
  }
};

// ==================== STAFF / ADMIN ENDPOINTS ====================

/**
 * Staff can see ALL accountability records
 */
exports.getAllRecords = async (req, res) => {
  try {
    const records = await prisma.accountability.findMany({
      include: {
        responsibleStudent: {
          select: { first_name: true, last_name: true, student_number: true }
        },
        item: true,
        reservation: true
      },
      orderBy: { created_at: 'desc' }
    });
    success(res, records);
  } catch (err) {
    error(res, err.message);
  }
};

/**
 * Staff can resolve/replace items
 */
exports.resolveRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution_notes, received_by } = req.body;

    const record = await prisma.accountability.update({
      where: { accountability_id: parseInt(id) },
      data: {
        resolution_status: 'RESOLVED',
        resolution_notes: resolution_notes || null,
        date_replaced: new Date(),
        received_by: received_by || req.user.username
      }
    });

    success(res, record, "Accountability record resolved successfully");
  } catch (err) {
    error(res, err.message);
  }
};