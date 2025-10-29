import { Router } from 'express';
import { registerUser,loginUser,getLoggedInUser,getAllUsers,updateUser,deleteUser,updatePassword} from '../controllers/user.controller.js';
import auth from '../middleware/auth.js';

const router = Router();

// @route   POST /api/users/register
// @desc    Registra un nuevo usuario
// @access  Private (solo para Admins)
router.post('/register', auth, registerUser);
// @route   POST /api/users/login
// @desc    Autentica un usuario y devuelve un token
// @access  Public
router.post('/login', loginUser);
// @route   GET /api/users/me
// @desc    Obtener datos del usuario logueado
// @access  Private
router.get('/me', auth, getLoggedInUser); // Asegúrate de importar getLoggedInUser

router.get('/', auth, getAllUsers);
router.put('/:id', auth, updateUser);
router.delete('/:id', auth, deleteUser);
router.put('/:id/password', auth, updatePassword);

export default router;