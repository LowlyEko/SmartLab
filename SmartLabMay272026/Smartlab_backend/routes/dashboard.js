// Smartlab_backend/routes/dashboard.js
const express = require('express');
const router = express.Router();

const { 
  getStudentDashboard, 
  getStaffDashboard 
} = require('../controllers/dashboardController');

const { authenticate } = require('../middleware/auth');

console.log('✅ Dashboard route loaded');

// Auto-detect based on user role
// user_type is lowercase for staff ('laboratory_staff', 'laboratory_chemist')
// and 'STUDENT' for students
router.get('/stats', authenticate, (req, res) => {
  const userType = req.user.user_type.toLowerCase();
  
  if (['laboratory_staff', 'admin', 'laboratory_chemist'].includes(userType)) {
    return getStaffDashboard(req, res);
  } else {
    return getStudentDashboard(req, res);
  }
});

module.exports = router;