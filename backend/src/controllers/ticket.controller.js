const { getConnection } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

exports.createTicket = async (req, res) => {
    const { title, description, assignedToArea } = req.body;
    const createdByUserId = req.user.id;

    if (!title || !description || !assignedToArea) {
        return res.status(400).json({ msg: 'Por favor, complete todos los campos requeridos.' });
    }

    try {
        const pool = await getConnection();
        await pool.query(
            `INSERT INTO "Tickets" ("Title", "Description", "CreatedByUserID", "AssignedToArea") 
             VALUES ($1, $2, $3, $4)`,
            [title, description, createdByUserId, assignedToArea]
        );

        res.status(201).json({ msg: 'Ticket creado exitosamente.' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor al crear el ticket.');
    }
};

exports.getTickets = async (req, res) => {
    const { id: userId, area: userArea } = req.user;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 9;
    const offset = (page - 1) * limit;
    const searchTerm = req.query.searchTerm || '';
    const status = req.query.status || 'Todos';
    const dateFrom = req.query.dateFrom;
    const dateTo = req.query.dateTo;

    try {
        const pool = await getConnection();

        // Actualizar tickets resueltos a cerrados
        await pool.query(`
            UPDATE "Tickets"
            SET "Status" = 'Cerrado', "UpdatedAt" = NOW()
            WHERE "Status" = 'Resuelto' AND "ResolvedAt" < NOW() - INTERVAL '1 day'
        `);

        let conditions = [];
        let params = [];
        let paramIndex = 1;

        if (userArea === 'Personal Operativo') {
            conditions.push(`"CreatedByUserID" = $${paramIndex++}`);
            params.push(userId);
        } else {
            conditions.push(`("AssignedToArea" = $${paramIndex} OR "CreatedByUserID" = $${paramIndex + 1})`);
            params.push(userArea, userId);
            paramIndex += 2;
        }

        if (searchTerm) {
            conditions.push(`("Title" ILIKE $${paramIndex} OR "Description" ILIKE $${paramIndex})`);
            params.push(`%${searchTerm}%`);
            paramIndex++;
        }

        if (status && status !== 'Todos') {
            conditions.push(`"Status" = $${paramIndex++}`);
            params.push(status);
        }

        if (dateFrom) {
            conditions.push(`"CreatedAt" >= $${paramIndex++}`);
            params.push(dateFrom);
        }

        if (dateTo) {
            conditions.push(`"CreatedAt" < $${paramIndex++}`);
            params.push(dateTo);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const [ticketsResult, countResult] = await Promise.all([
            pool.query(`
                SELECT t."TicketID", t."Title", t."Status", t."CreatedAt", t."Description",
                       u."FullName" as "CreatedBy",
                       (SELECT COUNT(*) FROM "TicketMessages" tm WHERE tm."TicketID" = t."TicketID" AND tm."IsRead" = false AND tm."SenderID" != $1) as "unreadCount"
                FROM "Tickets" t
                JOIN "Users" u ON t."CreatedByUserID" = u."UserID"
                ${whereClause}
                ORDER BY t."CreatedAt" DESC
                OFFSET ${offset} LIMIT ${limit}
            `, [userId, ...params.slice(1)]),

            pool.query(`SELECT COUNT(*) as "totalTickets" FROM "Tickets" t ${whereClause}`, params)
        ]);

        const totalTickets = parseInt(countResult.rows[0].totalTickets, 10);
        const totalPages = Math.ceil(totalTickets / limit);

        res.json({
            tickets: ticketsResult.rows,
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
        const result = await pool.query(`
            SELECT t.*, u."FullName" as "CreatedByFullName",
                   (SELECT COUNT(*) FROM "TicketMessages" tm WHERE tm."TicketID" = t."TicketID" AND tm."IsRead" = false AND tm."SenderID" != $1) as "unreadCount"
            FROM "Tickets" t
            JOIN "Users" u ON t."CreatedByUserID" = u."UserID"
            WHERE t."TicketID" = $2
        `, [userId, ticketId]);

        if (result.rows.length === 0) return res.status(404).json({ msg: 'Ticket no encontrado.' });

        const ticket = result.rows[0];

        if (userArea === 'Personal Operativo') {
            if (ticket.CreatedByUserID !== userId) return res.status(403).json({ msg: 'Acceso denegado.' });
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

    if (!['Soporte', 'Contabilidad'].includes(userArea)) {
        return res.status(403).json({ msg: 'No tienes permiso para cambiar el estado.' });
    }

    try {
        const pool = await getConnection();
        const ticketResult = await pool.query(`SELECT "AssignedToArea" FROM "Tickets" WHERE "TicketID" = $1`, [ticketId]);

        if (ticketResult.rows.length === 0) return res.status(404).json({ msg: 'Ticket no encontrado.' });

        const ticket = ticketResult.rows[0];
        if (ticket.AssignedToArea !== userArea) return res.status(403).json({ msg: 'No puedes cambiar el estado de un ticket que no está asignado a tu área.' });

        let query = `UPDATE "Tickets" SET "Status" = $1, "UpdatedAt" = NOW()`;
        const params = [status];

        if (status === 'Resuelto') {
            query += `, "ResolvedAt" = NOW()`;
        }
        query += ` WHERE "TicketID" = $2`;
        params.push(ticketId);

        await pool.query(query, params);

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
        const result = await pool.query(`
            SELECT m.*, u."FullName" as "SenderFullName"
            FROM "TicketMessages" m
            JOIN "Users" u ON m."SenderID" = u."UserID"
            WHERE m."TicketID" = $1
            ORDER BY m."SentAt" ASC
        `, [ticketId]);

        res.json(result.rows);
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

    if (!messageText && !file) return res.status(400).json({ msg: 'El mensaje no puede estar vacío.' });

    try {
        const pool = await getConnection();

        const fileName = file ? file.originalname : null;
        const fileUrl = file ? `/uploads/${file.filename}` : null;
        const fileType = file ? file.mimetype : null;

        const insertResult = await pool.query(`
            INSERT INTO "TicketMessages" ("TicketID", "SenderID", "MessageText", "FileName", "FileURL", "FileType")
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [ticketId, senderId, messageText || null, fileName, fileUrl, fileType]);

        const newMessage = insertResult.rows[0];

        const userResult = await pool.query(`SELECT "FullName" FROM "Users" WHERE "UserID" = $1`, [senderId]);

        const fullMessage = {
            ...newMessage,
            SenderFullName: userResult.rows[0].FullName
        };

        req.io.to(ticketId).emit('newMessage', fullMessage);

        const ticketResult = await pool.query(`SELECT "Title", "CreatedByUserID" FROM "Tickets" WHERE "TicketID" = $1`, [ticketId]);

        req.io.emit('ticketUpdate', {
            ticketId: parseInt(ticketId, 10),
            title: ticketResult.rows[0].Title,
            senderName: fullMessage.SenderFullName,
            senderId,
            recipientId: ticketResult.rows[0].CreatedByUserID
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
        await pool.query(`
            UPDATE "TicketMessages"
            SET "IsRead" = true
            WHERE "TicketID" = $1 AND "SenderID" != $2 AND "IsRead" = false
        `, [ticketId, userId]);

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

    if (!title || !description) return res.status(400).json({ msg: 'El título y la descripción son requeridos.' });

    try {
        const pool = await getConnection();
        const ticketResult = await pool.query(`
            SELECT "CreatedByUserID", "Status"
            FROM "Tickets"
            WHERE "TicketID" = $1
        `, [ticketId]);

        if (ticketResult.rows.length === 0) return res.status(404).json({ msg: 'Ticket no encontrado.' });

        const ticket = ticketResult.rows[0];

        if (ticket.CreatedByUserID !== userId && userRole !== 'Administrador') {
            return res.status(403).json({ msg: 'No tienes permiso para editar este ticket.' });
        }

        if (ticket.Status !== 'Abierto') {
            return res.status(403).json({ msg: `No se puede editar un ticket en estado "${ticket.Status}".` });
        }

        await pool.query(`
            UPDATE "Tickets"
            SET "Title" = $1, "Description" = $2, "UpdatedAt" = NOW()
            WHERE "TicketID" = $3
        `, [title, description, ticketId]);

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
        const ticketResult = await pool.query(`
            SELECT "Status", "CreatedByUserID"
            FROM "Tickets"
            WHERE "TicketID" = $1
        `, [ticketId]);

        if (ticketResult.rows.length === 0) return res.status(404).json({ msg: 'Ticket no encontrado.' });

        const ticket = ticketResult.rows[0];

        if (ticket.Status !== 'Abierto') return res.status(403).json({ msg: 'No se puede cancelar un ticket que ya está en proceso.' });
        if (ticket.CreatedByUserID !== userId && userRole !== 'Administrador') {
            return res.status(403).json({ msg: 'No tienes permiso para cancelar este ticket.' });
        }

        await pool.query(`
            UPDATE "Tickets"
            SET "Status" = 'Cancelado', "UpdatedAt" = NOW()
            WHERE "TicketID" = $1
        `, [ticketId]);

        res.json({ msg: 'Ticket cancelado exitosamente.' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor al cancelar el ticket.');
    }
};
