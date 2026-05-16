const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { success, error } = require('../utils/response');
const prisma = require('../config/prisma');

const JWT_SECRET   = process.env.JWT_SECRET || 'your_super_secret_jwt_key_123!';
const STAFF_ROLES  = ['LABORATORY_STAFF', 'LABORATORY_CHEMIST', 'ADMIN'];
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ── Register (staff only) ─────────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { username, first_name, last_name, email, password } = req.body;
    const user_type = 'LABORATORY_STAFF';

    if (!username || !first_name || !last_name || !email || !password)
      return error(res, 'All fields are required.', 400);

    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password))
      return error(res, 'Password must be at least 8 characters and include letters and numbers.', 400);

    const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
    if (existing) return error(res, 'Username or email already in use.', 400);

    const password_hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { username, first_name, last_name, email, password_hash, user_type },
    });

    const token = jwt.sign(
      { user_id: user.user_id, username: user.username, user_type: user.user_type },
      JWT_SECRET, { expiresIn: '24h' }
    );

    success(res, {
      token,
      user: { id: user.user_id, username: user.username, first_name: user.first_name, last_name: user.last_name, email: user.email, user_type: user.user_type },
    }, 'Account created successfully.', 201);

  } catch (err) {
    console.error('Register error:', err);
    error(res, 'A server error occurred. Please try again.');
  }
};

// ── Login (staff / admin only) ────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password)
      return error(res, 'Username and password are required.', 400);

    const user = await prisma.user.findFirst({
      where: { OR: [{ username }, { email: username }] },
    });

    if (!user || !user.password_hash)
      return error(res, 'Invalid credentials.', 401);

    if (!user.is_active)
      return error(res, 'Your account has been deactivated. Contact support.', 403);

    if (!STAFF_ROLES.includes(user.user_type))
      return error(res, 'Access denied. This portal is for staff only.', 403);

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return error(res, 'Invalid credentials.', 401);

    const token = jwt.sign(
      { user_id: user.user_id, username: user.username, user_type: user.user_type },
      JWT_SECRET, { expiresIn: '24h' }
    );

    success(res, {
      token,
      user: { id: user.user_id, username: user.username, first_name: user.first_name, last_name: user.last_name, email: user.email, user_type: user.user_type },
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

    let user = await prisma.user.findFirst({ where: { email } });

    if (user) {
      // Block staff from using Google login
      if (['LABORATORY_STAFF', 'LABORATORY_CHEMIST', 'ADMIN'].includes(user.user_type)) {
        return error(res, 'Staff accounts must use username and password.', 403);
      }

      if (!user.is_active)
        return error(res, 'Your account has been deactivated. Contact support.', 403);

      await prisma.user.update({
        where: { user_id: user.user_id },
        data:  { updated_at: new Date() },
      });

    } else {
      // Auto-register new student
      user = await prisma.user.create({
        data: {
          username:   email, // use email as username since no password login
          first_name: given_name,
          last_name:  family_name || '',
          email,
          is_active:  true,
          user_type:  'STUDENT',
        },
      });
    }

    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, user_type: user.user_type },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    success(res, {
      token,
      user: {
        id:             user.user_id,
        first_name:     user.first_name,
        last_name:      user.last_name,
        email:          user.email,
        user_type:      user.user_type,
        student_number: user.student_number || null,
      },
    }, 'Google login successful.');

  } catch (err) {
    console.error('Google login error:', err);
    error(res, 'Google authentication failed. Please try again.');
  }
};