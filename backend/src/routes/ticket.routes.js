import { Router } from 'express';
import auth from '../middleware/auth.js';
import upload from '../utils/upload.js'; 
import { createTicket, getTickets, getTicketById, updateTicketStatus,getTicketMessages,addTicketMessage,markMessagesAsRead,updateTicket,cancelTicket } from '../controllers/ticket.controller.js';

const router = Router();

// @route   POST /api/tickets
// @desc    Crear un nuevo ticket
// @access  Private
router.post('/', auth, createTicket);
// @route   GET /api/tickets
// @desc    Obtener tickets según el rol del usuario
// @access  Private
router.get('/', auth, getTickets);
// @route   GET /api/tickets/:id
// @desc    Obtener los detalles de un ticket específico
// @access  Private
router.get('/:id', auth, getTicketById);
// @route   PUT /api/tickets/:id/status
// @desc    Actualizar el estado de un ticket
// @access  Private (Soporte/Contabilidad)
router.put('/:id/status', auth, updateTicketStatus);
router.get('/:id/messages', auth, getTicketMessages);
router.post('/:id/messages', auth, upload.single('file'), addTicketMessage);
router.put('/:id', auth, updateTicket);
router.put('/:id/cancel', auth, cancelTicket);
router.put('/:id/messages/read', auth, markMessagesAsRead);

export default router;