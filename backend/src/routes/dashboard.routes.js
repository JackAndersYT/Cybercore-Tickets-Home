import { Router } from 'express';
import auth from '../middleware/auth.js';
import { getDashboardStats } from '../controllers/dashboard.controller.js';

const router = Router();

router.get('/stats', auth, getDashboardStats);

export default router;