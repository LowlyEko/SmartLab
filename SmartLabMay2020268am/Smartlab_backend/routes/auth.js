const express = require('express');
const router  = express.Router();

const { register, login, logout, googleStudentLogin } = require('../controllers/authController');

router.post('/register',       register);
router.post('/login',          login);
router.post('/logout',         logout);
router.post('/google-student', googleStudentLogin);

module.exports = router;