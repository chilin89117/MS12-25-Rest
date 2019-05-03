const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const validateSignup = require('../middleware/validateSignup');
const isAuth = require('../middleware/isAuth');
const validateStatus = require('../middleware/validateStatus');

router.post('/signup', validateSignup, authController.signup);
router.post('/login', authController.login);
router.get('/status', isAuth, authController.getStatus);
router.put('/status', isAuth, validateStatus, authController.updateStatus);

module.exports = router;