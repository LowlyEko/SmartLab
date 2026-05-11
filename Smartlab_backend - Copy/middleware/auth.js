// middleware/auth.js
const jwt = require('jsonwebtoken');
const { error } = require('../utils/response');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_123!';

exports.authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(res, "Access token required", 401);
  }

  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return error(res, "Invalid or expired token", 401);
  }
};

// Role middleware
exports.requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.user_type)) {
      return error(res, "Insufficient permissions. This action requires higher privileges.", 403);
    }
    next();
  };
};

// ✅ Correct export (do NOT export 'router' here)
module.exports = {
  authenticate: exports.authenticate,
  requireRole: exports.requireRole
};