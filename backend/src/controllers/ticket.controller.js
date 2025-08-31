//ticket.controller.js

const { getConnection, sql } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

exports.createTicket = async (req, res) => {
    const { title, description, assignedToArea } = req.body;
    const createdByUserId = req.user.id; // Obtenido del middleware de autenticación

    if (!title || !description || !assignedToArea) {
        return res.status(400).json({ msg: 'Por favor, complete todos los campos requeridos.' });
    }

    try {
        const pool = await getConnection();
        await pool.request()
            .input('Title', sql.NVarChar, title)
            .input('Description', sql.NVarChar, description)
            .input('CreatedByUserID', sql.Int, createdByUserId)
            .input('AssignedToArea', sql.NVarChar, assignedToArea)
            .query('INSERT INTO Tickets (Title, Description, CreatedByUserID, AssignedToArea) VALUES (@Title, @Description, @CreatedByUserID, @AssignedToArea)');

        res.status(201).json({ msg: 'Ticket creado exitosamente.' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor al crear el ticket.');
    }
};
exports.getTickets = async (req, res) => {
    const { id: userId, area: userArea } = req.user;

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 9; // 9 tickets por página (3x3 grid)
    const searchTerm = req.query.searchTerm || '';
    
    const status = req.query.status || 'Todos';
    const dateFrom = req.query.dateFrom;
    const dateTo = req.query.dateTo;

    const offset = (page - 1) * limit;

    try {
        const pool = await getConnection();
        
        await pool.request().query(`
            UPDATE Tickets 
            SET Status = 'Cerrado', UpdatedAt = GETDATE()
            WHERE Status = 'Resuelto' AND ResolvedAt < DATEADD(day, -1, GETDATE())
        `);

        let whereClauses = [];
        const request = pool.request();
        request.input('userId', sql.Int, userId);

        if (userArea === 'Personal Operativo') {
            whereClauses.push('t.CreatedByUserID = @userId');
        } else {
            whereClauses.push('(t.AssignedToArea = @userArea OR t.CreatedByUserID = @userId)');
            request.input('userArea', sql.NVarChar, userArea);
        }

        if (searchTerm) {
            whereClauses.push('(t.Title LIKE @searchTerm OR t.Description LIKE @searchTerm)');
            request.input('searchTerm', sql.NVarChar, `%${searchTerm}%`);
        }
        
        if (status && status !== 'Todos') {
            whereClauses.push('t.Status = @status');
            request.input('status', sql.NVarChar, status);
        }
        if (dateFrom) {
            whereClauses.push('t.CreatedAt >= @dateFrom');
            request.input('dateFrom', sql.Date, dateFrom);
        }
        if (dateTo) {
            whereClauses.push('t.CreatedAt < DATEADD(day, 1, @dateTo)');
            request.input('dateTo', sql.Date, dateTo);
        }

        const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const [ticketsResult, countResult] = await Promise.all([
            request.query(`
                SELECT 
                    t.TicketID, t.Title, t.Status, t.CreatedAt, t.Description,
                    u.FullName as CreatedBy,
                    (SELECT COUNT(*) FROM TicketMessages tm WHERE tm.TicketID = t.TicketID AND tm.IsRead = 0 AND tm.SenderID != @userId) as unreadCount
                FROM Tickets t
                JOIN Users u ON t.CreatedByUserID = u.UserID
                ${whereString}
                ORDER BY t.CreatedAt DESC
                OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
            `),
            request.query(`SELECT COUNT(*) as totalTickets FROM Tickets t ${whereString}`)
        ]);

        const totalTickets = countResult.recordset[0].totalTickets;
        const totalPages = Math.ceil(totalTickets / limit);

        res.json({
            tickets: ticketsResult.recordset,
            totalPages,
            currentPage: page
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor al obtener los tickets.');
    }
};


exports.getTicketById = async (req, res) => {
    const { id: ticketId } = req.params;
    const { id: userId, area: userArea } = req.user;

    try {
        const pool = await getConnection();
        const request = pool.request();
        request.input('TicketID', sql.Int, ticketId);
        request.input('userId', sql.Int, userId);

        const result = await request.query(`
            SELECT 
                t.*, 
                u.FullName as CreatedByFullName,
                (SELECT COUNT(*) 
                 FROM TicketMessages tm 
                 WHERE tm.TicketID = t.TicketID AND tm.IsRead = 0 AND tm.SenderID != @userId) as unreadCount
            FROM Tickets t
            JOIN Users u ON t.CreatedByUserID = u.UserID
            WHERE t.TicketID = @TicketID
        `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ msg: 'Ticket no encontrado.' });
        }

        const ticket = result.recordset[0];

        if (userArea === 'Personal Operativo') {
            if (ticket.CreatedByUserID !== userId) {
                return res.status(403).json({ msg: 'Acceso denegado.' });
            }
        } else {
            if (ticket.AssignedToArea !== userArea && ticket.CreatedByUserID !== userId) {
                return res.status(403).json({ msg: 'No tienes permiso para ver este ticket.' });
            }
        }

        res.json(ticket);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor.');
    }
};
exports.updateTicketStatus = async (req, res) => {
    const { id: ticketId } = req.params;
    const { status } = req.body;
    const { area: userArea } = req.user;

    if (userArea !== 'Soporte' && userArea !== 'Contabilidad') {
        return res.status(403).json({ msg: 'No tienes permiso para cambiar el estado.' });
    }

    try {
        const pool = await getConnection();
        const ticketResult = await pool.request()
            .input('TicketID', sql.Int, ticketId)
            .query('SELECT AssignedToArea FROM Tickets WHERE TicketID = @TicketID');

        if (ticketResult.recordset.length === 0) {
            return res.status(404).json({ msg: 'Ticket no encontrado.' });
        }

        const ticket = ticketResult.recordset[0];

        if (ticket.AssignedToArea !== userArea) {
            return res.status(403).json({ msg: 'No puedes cambiar el estado de un ticket que no está asignado a tu área.' });
        }
        
        let query = 'UPDATE Tickets SET Status = @Status, UpdatedAt = GETDATE()';
        if (status === 'Resuelto') {
            query += ', ResolvedAt = GETDATE()';
        }
        query += ' WHERE TicketID = @TicketID';

        await pool.request()
            .input('Status', sql.NVarChar, status)
            .input('TicketID', sql.Int, ticketId)
            .query(query);

        res.json({ msg: 'Estado del ticket actualizado.' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor.');
    }
};
exports.getTicketMessages = async (req, res) => {
    const { id: ticketId } = req.params;
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('TicketID', sql.Int, ticketId)
            .query(`
                SELECT m.*, u.FullName as SenderFullName 
                FROM TicketMessages m
                JOIN Users u ON m.SenderID = u.UserID
                WHERE m.TicketID = @TicketID 
                ORDER BY m.SentAt ASC
            `);
        res.json(result.recordset);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al obtener los mensajes.');
    }
};

exports.addTicketMessage = async (req, res) => {
    const { id: ticketId } = req.params;
    const messageText = req.body.messageText || '';
    const file = req.file;
    const senderId = req.user.id;

    if (!messageText && !file) {
        return res.status(400).json({ msg: 'El mensaje no puede estar vacío.' });
    }

    try {
        const pool = await getConnection();
        const request = pool.request()
            .input('TicketID', sql.Int, ticketId)
            .input('SenderID', sql.Int, senderId)
            .input('MessageText', sql.NVarChar, messageText || null);

        if (file) {
            request.input('FileName', sql.NVarChar, file.originalname);
            const fileUrl = `/uploads/${file.filename}`;
            request.input('FileURL', sql.NVarChar, fileUrl);
            request.input('FileType', sql.NVarChar, file.mimetype);
        } else {
            request.input('FileName', sql.NVarChar, null);
            request.input('FileURL', sql.NVarChar, null);
            request.input('FileType', sql.NVarChar, null);
        }

        const result = await request.query(`
            INSERT INTO TicketMessages (TicketID, SenderID, MessageText, FileName, FileURL, FileType) 
            OUTPUT INSERTED.*
            VALUES (@TicketID, @SenderID, @MessageText, @FileName, @FileURL, @FileType)
        `);
        
        const newMessage = result.recordset[0];

        const userResult = await pool.request()
            .input('SenderID', sql.Int, senderId)
            .query('SELECT FullName FROM Users WHERE UserID = @SenderID');
        
        const fullMessage = {
            ...newMessage,
            SenderFullName: userResult.recordset[0].FullName
        };

        req.io.to(ticketId).emit('newMessage', fullMessage);
        
        const ticketResult = await pool.request()
            .input('TicketID', sql.Int, ticketId)
            .query('SELECT Title, CreatedByUserID FROM Tickets WHERE TicketID = @TicketID');
        
        req.io.emit('ticketUpdate', { 
            ticketId: parseInt(ticketId, 10),
            title: ticketResult.recordset[0].Title,
            senderName: fullMessage.SenderFullName,
            senderId: senderId,
            recipientId: ticketResult.recordset[0].CreatedByUserID
        });
        
        res.status(201).json(newMessage);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al enviar el mensaje.');
    }
};
exports.markMessagesAsRead = async (req, res) => {
    const { id: ticketId } = req.params;
    const { id: userId } = req.user;

    try {
        const pool = await getConnection();
        await pool.request()
            .input('TicketID', sql.Int, ticketId)
            .input('UserID', sql.Int, userId)
            .query(`
                UPDATE TicketMessages 
                SET IsRead = 1 
                WHERE TicketID = @TicketID AND SenderID != @UserID AND IsRead = 0
            `);
        
        req.io.to(ticketId).emit('messagesRead', { readerId: userId });

        res.status(200).json({ msg: 'Mensajes marcados como leídos.' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor.');
    }
};
exports.updateTicket = async (req, res) => {
    const { id: ticketId } = req.params;
    const { title, description } = req.body;
    const { id: userId, role: userRole } = req.user;

    if (!title || !description) {
        return res.status(400).json({ msg: 'El título y la descripción son requeridos.' });
    }

    try {
        const pool = await getConnection();
        
        // 1. Obtener el ticket para verificar permisos y estado
        const ticketResult = await pool.request()
            .input('TicketID', sql.Int, ticketId)
            .query('SELECT CreatedByUserID, Status FROM Tickets WHERE TicketID = @TicketID');

        if (ticketResult.recordset.length === 0) {
            return res.status(404).json({ msg: 'Ticket no encontrado.' });
        }

        const ticket = ticketResult.recordset[0];

        // 2. Verificar permisos: solo el creador o un admin pueden editar
        if (ticket.CreatedByUserID !== userId && userRole !== 'Administrador') {
            return res.status(403).json({ msg: 'No tienes permiso para editar este ticket.' });
        }

        // 3. Verificar estado: solo se puede editar si está "Abierto"
        if (ticket.Status !== 'Abierto') {
            return res.status(403).json({ msg: `No se puede editar un ticket en estado "${ticket.Status}".` });
        }

        // 4. Si todo es correcto, actualizar el ticket
        await pool.request()
            .input('TicketID', sql.Int, ticketId)
            .input('Title', sql.NVarChar, title)
            .input('Description', sql.NVarChar, description)
            .query('UPDATE Tickets SET Title = @Title, Description = @Description, UpdatedAt = GETDATE() WHERE TicketID = @TicketID');

        res.json({ msg: 'Ticket actualizado correctamente.' });

    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor al actualizar el ticket.');
    }
};
exports.cancelTicket = async (req, res) => {
    const { id: ticketId } = req.params;
    const { id: userId, role: userRole } = req.user;

    try {
        const pool = await getConnection();
        const ticketResult = await pool.request()
            .input('TicketID', sql.Int, ticketId)
            .query('SELECT Status, CreatedByUserID FROM Tickets WHERE TicketID = @TicketID');

        if (ticketResult.recordset.length === 0) {
            return res.status(404).json({ msg: 'Ticket no encontrado.' });
        }

        const ticket = ticketResult.recordset[0];

        // Regla 1: Solo se puede cancelar si está 'Abierto'
        if (ticket.Status !== 'Abierto') {
            return res.status(403).json({ msg: 'No se puede cancelar un ticket que ya está en proceso.' });
        }

        // Regla 2: Solo el creador o un admin pueden cancelar
        if (ticket.CreatedByUserID !== userId && userRole !== 'Administrador') {
            return res.status(403).json({ msg: 'No tienes permiso para cancelar este ticket.' });
        }

        // Actualizar el estado a 'Cancelado'
        await pool.request()
            .input('TicketID', sql.Int, ticketId)
            .query("UPDATE Tickets SET Status = 'Cancelado', UpdatedAt = GETDATE() WHERE TicketID = @TicketID");

        res.json({ msg: 'Ticket cancelado exitosamente.' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor al cancelar el ticket.');
    }
};