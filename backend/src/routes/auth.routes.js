const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.post('/register-company', authController.registerCompany);

module.exports = router;