// controllers/accountabilityController.js
const prisma = require('../config/prisma');
const { success, error } = require('../utils/response');

// ==================== HELPERS ====================

function parseSpecifics(specifics) {
  if (!specifics) return {};
  try {
    return JSON.parse(specifics);
  } catch {
    return { legacy_note: specifics };
  }
}

function buildSpecifics(body) {
  const { persons, teacher, subject, program_section, time_start, time_end, deadline, incident_type, note } = body;
  return JSON.stringify({
    persons:          Array.isArray(persons) ? persons : [],
    teacher:          teacher          || null,
    subject:          subject          || null,
    program_section:  program_section  || null,
    time_start:       time_start       || null,
    time_end:         time_end         || null,
    deadline:         deadline         || null,
    incident_type:    incident_type    || null,   // student: "DAMAGED" or "LOST"
    note:             note             || null     // student: free-text description
  });
}

function enrichRecord(r) {
  const extras = parseSpecifics(r.specifics);
  return {
    ...r,
    persons:         extras.persons         || [],
    teacher:         extras.teacher         || null,
    subject:         extras.subject         || null,
    program_section: extras.program_section || null,
    time_start:      extras.time_start      || null,
    time_end:        extras.time_end        || null,
    deadline:        extras.deadline        || null,
    incident_type:   extras.incident_type   || null,
    note:            extras.note            || null
  };
}

// ==================== STUDENT ENDPOINTS ====================

exports.getMyAccountability = async (req, res) => {
  try {
    const records = await prisma.accountability.findMany({
      where: { responsible_student: req.user.user_id },
      include: {
        item: true,
        reservation: {
          select: { activity_title: true, date_needed: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });
    success(res, records.map(enrichRecord));
  } catch (err) {
    error(res, err.message);
  }
};

exports.createRecord = async (req, res) => {
  try {
    const {
      item_id,
      item_description,
      quantity_broken,
      date_time_broken,
      resolution_status,
      date_replaced,
      received_by,
      reservation_id,
      responsible_student
    } = req.body;

    if (!item_description) {
      return error(res, 'item_description is required', 400);
    }
    if (!reservation_id) {
      return error(res, 'reservation_id is required', 400);
    }
    const parsedItemId = parseInt(item_id);
    if (!item_id || isNaN(parsedItemId) || parsedItemId <= 0) {
      return error(res, 'item_id is required', 400);
    }

    const isAdminOrStaff = ['ADMIN', 'LABORATORY_STAFF', 'LABORATORY_CHEMIST'].includes(
      req.user.user_type
    );

    // Admin supplies responsible_student FK; students use their own id
    const responsibleStudentId = isAdminOrStaff && responsible_student
      ? parseInt(responsible_student)
      : req.user.user_id;

    // Students can only create records against their own reservations
    if (!isAdminOrStaff) {
      const reservation = await prisma.reservation.findFirst({
        where: {
          reservation_id:    parseInt(reservation_id),
          reserving_student: req.user.user_id
        }
      });
      if (!reservation) {
        return error(res, 'Reservation not found or does not belong to you', 404);
      }
    }

    const record = await prisma.accountability.create({
      data: {
        reservation_id:      parseInt(reservation_id),
        responsible_student: responsibleStudentId,
        item_id:             parsedItemId,
        item_description,
        specifics:           buildSpecifics(req.body),
        quantity_broken:     parseInt(quantity_broken) || 1,
        date_time_broken:    date_time_broken ? new Date(date_time_broken) : new Date(),
        resolution_status:   resolution_status || 'PENDING',
        date_replaced:       date_replaced ? new Date(date_replaced) : null,
        received_by:         received_by || null
      },
      include: {
        responsibleStudent: {
          select: { user_id: true, first_name: true, last_name: true, student_number: true }
        },
        item: {
          select: { item_id: true, name: true, category: true, unit: true }
        },
        reservation: {
          select: { reservation_id: true, activity_title: true, date_needed: true, group_number: true }
        }
      }
    });

    success(res, enrichRecord(record), 'Accountability record created successfully', 201);
  } catch (err) {
    console.error(err);
    error(res, err.message);
  }
};

// ==================== ADMIN / STAFF ENDPOINTS ====================

exports.getAllRecords = async (req, res) => {
  try {
    const records = await prisma.accountability.findMany({
      include: {
        responsibleStudent: {
          select: {
            user_id:        true,
            first_name:     true,
            last_name:      true,
            student_number: true,
            section:        true,
            college:        true
          }
        },
        item: {
          select: {
            item_id:  true,
            name:     true,
            category: true,
            unit:     true
          }
        },
        reservation: {
          select: {
            reservation_id: true,
            activity_title: true,
            date_needed:    true,
            group_number:   true,
            professor_id:   true,
            custodian_id:   true,
            time_start:     true,
            time_end:       true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    success(res, records.map(enrichRecord));
  } catch (err) {
    error(res, err.message);
  }
};

// GET /api/accountability/students — student list for admin dropdowns
exports.getStudents = async (req, res) => {
  try {
    const students = await prisma.user.findMany({
      where: { user_type: 'STUDENT', is_active: true },
      select: {
        user_id:        true,
        first_name:     true,
        last_name:      true,
        student_number: true,
        section:        true
      },
      orderBy: [{ last_name: 'asc' }, { first_name: 'asc' }]
    });
    success(res, students);
  } catch (err) {
    error(res, err.message);
  }
};

// GET /api/accountability/reservations — reservation list for admin dropdowns
exports.getReservations = async (req, res) => {
  try {
    const reservations = await prisma.reservation.findMany({
      select: {
        reservation_id:    true,
        activity_title:    true,
        date_needed:       true,
        group_number:      true,
        reserving_student: true,
        reservingStudent: {
          select: { first_name: true, last_name: true }
        }
      },
      orderBy: { date_needed: 'desc' }
    });
    success(res, reservations);
  } catch (err) {
    error(res, err.message);
  }
};

exports.updateRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      item_id,
      item_description,
      quantity_broken,
      date_time_broken,
      resolution_status,
      date_replaced,
      received_by,
      resolution_notes,
      reservation_id,
      responsible_student
    } = req.body;

    const record = await prisma.accountability.update({
      where: { accountability_id: parseInt(id) },
      data: {
        ...(reservation_id      && { reservation_id:      parseInt(reservation_id) }),
        ...(item_id             && { item_id:             parseInt(item_id) }),
        ...(responsible_student && { responsible_student: parseInt(responsible_student) }),
        item_description:  item_description  || undefined,
        specifics:         buildSpecifics(req.body),
        quantity_broken:   quantity_broken   ? parseInt(quantity_broken) : undefined,
        date_time_broken:  date_time_broken  ? new Date(date_time_broken) : undefined,
        resolution_status: resolution_status || undefined,
        date_replaced:     date_replaced     ? new Date(date_replaced)   : null,
        received_by:       received_by !== undefined ? received_by : undefined,
        resolution_notes:  resolution_notes  !== undefined ? resolution_notes : undefined
      },
      include: {
        responsibleStudent: {
          select: { user_id: true, first_name: true, last_name: true, student_number: true }
        },
        item: {
          select: { item_id: true, name: true, category: true, unit: true }
        },
        reservation: {
          select: { reservation_id: true, activity_title: true, date_needed: true, group_number: true }
        }
      }
    });

    success(res, enrichRecord(record), 'Record updated successfully');
  } catch (err) {
    console.error(err);
    error(res, err.message);
  }
};

exports.resolveRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution_notes, received_by } = req.body;

    const record = await prisma.accountability.update({
      where: { accountability_id: parseInt(id) },
      data: {
        resolution_status: 'RESOLVED',
        resolution_notes:  resolution_notes || null,
        date_replaced:     new Date(),
        received_by:       received_by || req.user.username || null
      }
    });

    success(res, enrichRecord(record), 'Accountability record resolved successfully');
  } catch (err) {
    error(res, err.message);
  }
};

exports.deleteRecord = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.accountability.delete({
      where: { accountability_id: parseInt(id) }
    });

    success(res, { accountability_id: parseInt(id) }, 'Record deleted successfully');
  } catch (err) {
    console.error(err);
    error(res, err.message);
  }
};