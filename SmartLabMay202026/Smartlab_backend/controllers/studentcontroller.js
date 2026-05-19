// controllers/studentController.js
const prisma = require('../config/prisma');
const { success, error } = require('../utils/response');

/**
 * PATCH /api/students/me
 * Called once after Google login when student_id is null.
 * Body: { student_id, year_level, college?, section? }
 *
 * Rules:
 *  - Only students can call this.
 *  - student_id must be unique (not already taken by another account).
 *  - Once set, student_id cannot be changed by the student themselves
 *    (they would need admin intervention).
 */
exports.completeProfile = async (req, res) => {
  try {
    // Only students
    if (req.user.user_type !== 'STUDENT') {
      return error(res, 'Only students can complete a student profile.', 403);
    }

    const { student_id, year_level, college, section } = req.body;

    // Validate required fields
    if (!student_id?.trim()) {
      return error(res, 'Student ID is required.', 400);
    }

    const cleanId = student_id.trim();

    // Validate format — allow common school ID patterns e.g. "2021-00123"
    if (!/^[\w\-]+$/.test(cleanId) || cleanId.length > 30) {
      return error(res, 'Student ID must be alphanumeric (hyphens allowed), max 30 characters.', 400);
    }

    // Validate year_level
    const parsedYear = parseInt(year_level);
    if (!parsedYear || parsedYear < 1 || parsedYear > 6) {
      return error(res, 'Year level must be a number between 1 and 6.', 400);
    }

    // Fetch current student record
    const current = await prisma.student.findUnique({
      where: { user_id: req.user.user_id },
    });

    if (!current) {
      return error(res, 'Student account not found.', 404);
    }

    // Prevent re-setting student_id if already assigned
    if (current.student_id) {
      return error(res, 'Your student ID has already been set. Contact admin to change it.', 400);
    }

    // Check uniqueness
    const taken = await prisma.student.findUnique({
      where: { student_id: cleanId },
    });
    if (taken) {
      return error(res, 'That Student ID is already registered to another account.', 409);
    }

    // Persist
    const updated = await prisma.student.update({
      where: { user_id: req.user.user_id },
      data: {
        student_id: cleanId,
        year_level: parsedYear,
        college:    college?.trim()  || null,
        section:    section?.trim()  || null,
      },
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
    });

    success(res, updated, 'Profile completed successfully!');
  } catch (err) {
    console.error('Complete Profile Error:', err);
    error(res, 'Failed to save profile. Please try again.', 500);
  }
};