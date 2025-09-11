import express from 'express';
const router = express.Router();
import { registerCompany } from '../controllers/auth.controller.js';

router.post('/register-company', registerCompany);

export default router;