const { Router } = require('express');
const auth = require('../middleware/auth');
const { getDashboardStats } = require('../controllers/dashboard.controller');

const router = Router();

router.get('/stats', auth, getDashboardStats);

module.exports = router;