// middleware/auth.js
const jwt    = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { error } = require('../utils/response');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_123!';

// ---------------------------------------------------------------------------
// Role constants — match the values stored in admin.role and the 'STUDENT'
// sentinel used in JWT payloads for students.
// ---------------------------------------------------------------------------
const STAFF_ROLES    = ['laboratory_staff', 'laboratory_chemist'];
const ALL_ADMIN_ROLES = [...STAFF_ROLES]; // expand if you add more roles later

// ---------------------------------------------------------------------------
// authenticate
// ---------------------------------------------------------------------------
// Verifies the Bearer JWT, then hydrates req.user with a consistent shape:
//
//  For STAFF (admin table):
//    req.user = {
//      user_id:   admin.admin_id,   ← integer PK in admin table
//      email:     admin.email,
//      user_type: admin.role,       ← 'laboratory_staff' | 'laboratory_chemist'
//      is_staff:  true,
//    }
//
//  For STUDENTS (student table):
//    req.user = {
//      user_id:    student.user_id,   ← integer PK in student table
//      student_id: student.student_id,← varchar e.g. "2021-00123" (may be null)
//      email:      student.email,
//      user_type:  'STUDENT',
//      is_staff:   false,
//    }
//
// Controllers receive req.user and can branch on is_staff or user_type.
// ---------------------------------------------------------------------------
exports.authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(res, 'Access token required', 401);
  }

  let decoded;
  try {
    decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
  } catch {
    return error(res, 'Invalid or expired token', 401);
  }

  try {
    if (decoded.user_type === 'STUDENT') {
      // ── Student path ──────────────────────────────────────────────────────
      const student = await prisma.student.findUnique({
        where:  { user_id: decoded.user_id },
        select: { user_id: true, student_id: true, email: true, is_active: true },
      });

      if (!student)
        return error(res, 'Account not found', 401);
      if (!student.is_active)
        return error(res, 'Your account has been deactivated. Contact support.', 403);

      req.user = {
        user_id:    student.user_id,
        student_id: student.student_id, // varchar — used as FK in reservations / accountability
        email:      student.email,
        user_type:  'STUDENT',
        is_staff:   false,
      };

    } else {
      // ── Staff / Admin path ────────────────────────────────────────────────
      const admin = await prisma.admin.findUnique({
        where:  { admin_id: decoded.user_id },
        select: { admin_id: true, email: true, role: true, is_active: true },
      });

      if (!admin)
        return error(res, 'Account not found', 401);
      if (!admin.is_active)
        return error(res, 'Your account has been deactivated. Contact support.', 403);

      req.user = {
        user_id:   admin.admin_id,
        email:     admin.email,
        user_type: admin.role, // 'laboratory_staff' | 'laboratory_chemist'
        is_staff:  true,
      };
    }

    next();
  } catch (err) {
    console.error('Auth middleware DB error:', err);
    return error(res, 'Authentication failed', 500);
  }
};

// ---------------------------------------------------------------------------
// requireRole(...roles)
// ---------------------------------------------------------------------------
// Usage examples (match the strings in admin.role, or 'STUDENT'):
//
//   requireRole('laboratory_staff', 'laboratory_chemist')  ← any staff
//   requireRole('laboratory_staff')                         ← staff only
//   requireRole('STUDENT')                                  ← students only
//
// Pass the STAFF_ROLES / ALL_ADMIN_ROLES constants for convenience:
//   requireRole(...STAFF_ROLES)
// ---------------------------------------------------------------------------
exports.requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.user_type)) {
      return error(res, 'Insufficient permissions. This action requires higher privileges.', 403);
    }
    next();
  };
};

// ---------------------------------------------------------------------------
// requireStaff
// ---------------------------------------------------------------------------
// Convenience shorthand — blocks students, allows any staff role.
// ---------------------------------------------------------------------------
exports.requireStaff = (req, res, next) => {
  if (!req.user || !req.user.is_staff) {
    return error(res, 'Insufficient permissions. Staff access required.', 403);
  }
  next();
};

// ---------------------------------------------------------------------------
// Exported role constant so routes don't hardcode strings
// ---------------------------------------------------------------------------
exports.STAFF_ROLES     = STAFF_ROLES;
exports.ALL_ADMIN_ROLES = ALL_ADMIN_ROLES;

module.exports = {
  authenticate:    exports.authenticate,
  requireRole:     exports.requireRole,
  requireStaff:    exports.requireStaff,
  STAFF_ROLES:     exports.STAFF_ROLES,
  ALL_ADMIN_ROLES: exports.ALL_ADMIN_ROLES,
};