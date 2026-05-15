const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { success, error } = require('../utils/response');
const prisma = require('../config/prisma');
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_123!';

exports.register = async (req, res) => {
  try {
    const { username, first_name, last_name, email, password, student_number, user_type = 'STUDENT' } = req.body;

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] }
    });

    if (existingUser) return error(res, "User already exists", 400);

    const password_hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        first_name,
        last_name,
        email,
        password_hash,
        student_number,
        user_type,
      }
    });

    success(res, { id: user.user_id, username: user.username }, "User registered successfully", 201);
  } catch (err) {
    error(res, err.message);
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user || !user.password_hash) return error(res, "Invalid credentials", 401);

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return error(res, "Invalid credentials", 401);

    const token = jwt.sign(
      { user_id: user.user_id, username: user.username, user_type: user.user_type },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    success(res, {
      token,
      user: {
        id: user.user_id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        user_type: user.user_type
      }
    }, "Login successful");
  } catch (err) {
    error(res, err.message);
  }
};