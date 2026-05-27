const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { success, error } = require('../utils/response');
const prisma = require('../config/prisma');

const JWT_SECRET   = process.env.JWT_SECRET || 'your_super_secret_jwt_key_123!';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ── Register (admin/staff only) ───────────────────────────────────────────────
// Creates a new Admin row. Role must be 'laboratory_staff' or 'laboratory_chemist'.
exports.register = async (req, res) => {
  try {
    const { first_name, last_name, email, password, role } = req.body;

    const VALID_ROLES = ['laboratory_staff', 'laboratory_chemist'];
    const resolvedRole = (role || 'laboratory_staff').toLowerCase();

    if (!first_name || !last_name || !email || !password)
      return error(res, 'All fields are required.', 400);

    if (!VALID_ROLES.includes(resolvedRole))
      return error(res, `Role must be one of: ${VALID_ROLES.join(', ')}`, 400);

    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password))
      return error(res, 'Password must be at least 8 characters and include letters and numbers.', 400);

    const existing = await prisma.admin.findUnique({ where: { email } });
    if (existing) return error(res, 'Email already in use.', 400);

    const hashed = await bcrypt.hash(password, 10);

    const admin = await prisma.admin.create({
      data: { first_name, last_name, email, password: hashed, role: resolvedRole },
    });

    const token = jwt.sign(
      { user_id: admin.admin_id, email: admin.email, user_type: admin.role },
      JWT_SECRET, { expiresIn: '24h' }
    );

    success(res, {
      token,
      user: {
        id:         admin.admin_id,
        first_name: admin.first_name,
        last_name:  admin.last_name,
        email:      admin.email,
        user_type:  admin.role,
      },
    }, 'Account created successfully.', 201);

  } catch (err) {
    console.error('Register error:', err);
    error(res, 'A server error occurred. Please try again.');
  }
};

// ── Login (staff only — email + password) ─────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Accept 'username' field as email for backwards compatibility
    const resolvedEmail = email || req.body.username;

    if (!resolvedEmail || !password)
      return error(res, 'Email and password are required.', 400);

    const admin = await prisma.admin.findUnique({ where: { email: resolvedEmail } });

    if (!admin)
      return error(res, 'Invalid credentials.', 401);

    if (!admin.is_active)
      return error(res, 'Your account has been deactivated. Contact support.', 403);

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) return error(res, 'Invalid credentials.', 401);

    const token = jwt.sign(
      { user_id: admin.admin_id, email: admin.email, user_type: admin.role },
      JWT_SECRET, { expiresIn: '24h' }
    );

    success(res, {
      token,
      user: {
        id:         admin.admin_id,
        first_name: admin.first_name,
        last_name:  admin.last_name,
        email:      admin.email,
        user_type:  admin.role,
      },
    }, 'Login successful.');

  } catch (err) {
    console.error('Login error:', err);
    error(res, 'A server error occurred. Please try again.');
  }
};

// ── Logout ────────────────────────────────────────────────────────────────────
exports.logout = (req, res) => {
  success(res, null, 'Logged out successfully.');
};

// ── Google Login (students only) ──────────────────────────────────────────────
// Students have no password — they authenticate exclusively via Google OAuth.
// On first login they are auto-registered in the `student` table.
exports.googleStudentLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential)
      return error(res, 'Google credential is required.', 400);

    const ticket = await googleClient.verifyIdToken({
      idToken:  credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, given_name, family_name } = payload;

    // Block staff from using Google login
    const staffMatch = await prisma.admin.findUnique({ where: { email } });
    if (staffMatch) {
      return error(res, 'Staff accounts must use email and password.', 403);
    }

    let student = await prisma.student.findUnique({ where: { email } });

    if (student) {
      if (!student.is_active)
        return error(res, 'Your account has been deactivated. Contact support.', 403);

      // Touch updated_at
      await prisma.student.update({
        where: { user_id: student.user_id },
        data:  { updated_at: new Date() },
      });

    } else {
      // Auto-register new student
      student = await prisma.student.create({
        data: {
          first_name: given_name  || '',
          last_name:  family_name || '',
          email,
          year_level: 1,       // default; student can update their profile later
          is_active:  true,
          user_type:  'student',
        },
      });
    }

    const token = jwt.sign(
      { user_id: student.user_id, email: student.email, user_type: 'STUDENT' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    success(res, {
      token,
      user: {
        id:         student.user_id,
        first_name: student.first_name,
        last_name:  student.last_name,
        email:      student.email,
        user_type:  'STUDENT',
        student_id: student.student_id || null,
      },
    }, 'Google login successful.');

  } catch (err) {
    console.error('Google login error:', err);
    error(res, 'Google authentication failed. Please try again.');
  }
};