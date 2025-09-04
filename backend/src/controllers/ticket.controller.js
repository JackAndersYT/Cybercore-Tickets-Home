const { getConnection } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Crear un ticket
exports.createTicket = async (req, res) => {
    const { title, description, assignedtoarea } = req.body;
    const createdbyuserid = parseInt(req.user.id, 10);

    if (!title || !description || !assignedtoarea) {
        return res.status(400).json({ msg: 'Por favor, complete todos los campos requeridos.' });
    }

    try {
        const pool = await getConnection();
        await pool.query(
            `INSERT INTO "Tickets" (title, description, createdbyuserid, assignedtoarea) 
             VALUES ($1, $2, $3, $4)`,
            [title, description, createdbyuserid, assignedtoarea]
        );

        res.status(201).json({ msg: 'Ticket creado exitosamente.' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor al crear el ticket.');
    }
};

// Obtener tickets con filtros y paginación
exports.getTickets = async (req, res) => {
    const { id: userId, area: userArea } = req.user;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 9;
    const offset = (page - 1) * limit;
    const searchTerm = req.query.searchterm || '';
    const status = req.query.status || 'Todos';
    const dateFrom = req.query.datefrom;
    const dateTo = req.query.dateto;

    try {
        const pool = await getConnection();

        // Actualizar tickets resueltos a cerrados
        await pool.query(`
            UPDATE "Tickets"
            SET status = 'Cerrado', updatedat = NOW()
            WHERE status = 'Resuelto' AND resolvedat < NOW() - INTERVAL '1 day'
        `);

        const whereParams = [];
        let paramIndex = 1;
        let conditions = [];

        // Filtro por área/usuario
        if (userArea === 'Personal Operativo') {
            conditions.push(`createdbyuserid = ${paramIndex++}`);
            whereParams.push(userId);
        } else {
            conditions.push(`(assignedtoarea = ${paramIndex++} OR createdbyuserid = ${paramIndex++})`);
            whereParams.push(userArea, userId);
        }

        // Filtro por searchTerm
        if (searchTerm) {
            conditions.push(`(title ILIKE ${paramIndex} OR description ILIKE ${paramIndex})`);
            whereParams.push(`%${searchTerm}%`);
            paramIndex++;
        }

        // Filtro por status
        if (status && status !== 'Todos') {
            conditions.push(`status = ${paramIndex++}`);
            whereParams.push(status);
        }

        // Filtro por fechas
        if (dateFrom) {
            conditions.push(`createdat >= ${paramIndex++}`);
            whereParams.push(dateFrom);
        }
        if (dateTo) {
            conditions.push(`createdat < ${paramIndex++}`);
            whereParams.push(dateTo);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Conteo total para paginación
        const countQuery = `SELECT COUNT(*) AS totaltickets FROM "Tickets" t ${whereClause}`;
        const countResult = await pool.query(countQuery, whereParams);
        const totalTickets = parseInt(countResult.rows[0].totaltickets, 10);
        const totalPages = Math.ceil(totalTickets / limit);

        // Parámetros y cláusula WHERE para la consulta principal de tickets
        const ticketsParams = [userId, ...whereParams, offset, limit];
        const ticketsWhereClause = whereClause.replace(/\$(\d+)/g, (_, n) => `${parseInt(n) + 1}`);
        
        const offsetLimitIndex = whereParams.length + 2;

        const ticketsQuery = `
            SELECT 
                t.ticketid, t.title, t.status, t.createdat, t.description,
                u.fullname AS createdby,
                (
                    SELECT COUNT(*) 
                    FROM "TicketMessages" tm
                    WHERE tm.ticketid = t.ticketid
                      AND tm.isread = false
                      AND tm.senderid != $1
                ) AS unreadcount
            FROM "Tickets" t
            JOIN "Users" u ON t.createdbyuserid = u.userid
            ${ticketsWhereClause}
            ORDER BY t.createdat DESC
            OFFSET ${offsetLimitIndex} LIMIT ${offsetLimitIndex + 1}
        `;
        
        const ticketsResult = await pool.query(ticketsQuery, ticketsParams);

        res.json({
            tickets: ticketsResult.rows,
            totalPages,
            currentPage: page
        });

    } catch (error) {
        console.error('Error en getTickets:', error);
        res.status(500).send('Error en el servidor al obtener los tickets.');
    }
};

// Obtener ticket por ID
exports.getTicketById = async (req, res) => {
    const ticketid = parseInt(req.params.id, 10);
    const userid = parseInt(req.user.id, 10);
    const userarea = req.user.area;

    try {
        const pool = await getConnection();
        const result = await pool.query(`
            SELECT t.*, u.fullname as createdbyfullname,
                   (SELECT COUNT(*) 
                    FROM "TicketMessages" tm 
                    WHERE tm.ticketid = t.ticketid 
                      AND tm.isread = false 
                      AND tm.senderid != $1) as unreadcount
            FROM "Tickets" t
            JOIN "Users" u ON t.createdbyuserid = u.userid
            WHERE t.ticketid = $2
        `, [userid, ticketid]);

        if (result.rows.length === 0) return res.status(404).json({ msg: 'Ticket no encontrado.' });

        const ticket = result.rows[0];

        if (userarea === 'Personal Operativo') {
            if (ticket.createdbyuserid !== userid) return res.status(403).json({ msg: 'Acceso denegado.' });
        } else {
            if (ticket.assignedtoarea !== userarea && ticket.createdbyuserid !== userid) {
                return res.status(403).json({ msg: 'No tienes permiso para ver este ticket.' });
            }
        }

        res.json(ticket);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor.');
    }
};

// Actualizar estado del ticket
exports.updateTicketStatus = async (req, res) => {
    const ticketid = parseInt(req.params.id, 10);
    const { status } = req.body;
    const userarea = req.user.area;

    if (!['Soporte', 'Contabilidad'].includes(userarea)) {
        return res.status(403).json({ msg: 'No tienes permiso para cambiar el estado.' });
    }

    try {
        const pool = await getConnection();
        const ticketResult = await pool.query(`SELECT assignedtoarea FROM "Tickets" WHERE ticketid = $1`, [ticketid]);

        if (ticketResult.rows.length === 0) return res.status(404).json({ msg: 'Ticket no encontrado.' });

        const ticket = ticketResult.rows[0];
        if (ticket.assignedtoarea !== userarea) return res.status(403).json({ msg: 'No puedes cambiar el estado de un ticket que no está asignado a tu área.' });

        let query = `UPDATE "Tickets" SET status = $1, updatedat = NOW()`;
        const params = [status];

        if (status === 'Resuelto') {
            query += `, resolvedat = NOW()`;
        }
        query += ` WHERE ticketid = $2`;
        params.push(ticketid);

        await pool.query(query, params);

        res.json({ msg: 'Estado del ticket actualizado.' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor.');
    }
};

// Obtener mensajes de un ticket
exports.getTicketMessages = async (req, res) => {
    const ticketid = parseInt(req.params.id, 10);

    try {
        const pool = await getConnection();
        const result = await pool.query(`
            SELECT m.*, u.fullname as senderfullname
            FROM "TicketMessages" m
            JOIN "Users" u ON m.senderid = u.userid
            WHERE m.ticketid = $1
            ORDER BY m.sentat ASC
        `, [ticketid]);

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al obtener los mensajes.');
    }
};

// Agregar mensaje a un ticket
exports.addTicketMessage = async (req, res) => {
    const ticketid = parseInt(req.params.id, 10);
    const senderid = parseInt(req.user.id, 10);
    const messagetext = req.body.messagetext || '';
    const file = req.file;

    if (!messagetext && !file) return res.status(400).json({ msg: 'El mensaje no puede estar vacío.' });

    try {
        const pool = await getConnection();

        const filename = file ? file.originalname : null;
        const fileurl = file ? `/uploads/${file.filename}` : null;
        const filetype = file ? file.mimetype : null;

        const insertResult = await pool.query(`
            INSERT INTO "TicketMessages" (ticketid, senderid, messagetext, filename, fileurl, filetype)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [ticketid, senderid, messagetext || null, filename, fileurl, filetype]);

        const newMessage = insertResult.rows[0];

        const userResult = await pool.query(`SELECT fullname FROM "Users" WHERE userid = $1`, [senderid]);

        const fullMessage = {
            ...newMessage,
            senderfullname: userResult.rows[0].fullname
        };

        req.io.to(ticketid).emit('newMessage', fullMessage);

        const ticketResult = await pool.query(`SELECT title, createdbyuserid FROM "Tickets" WHERE ticketid = $1`, [ticketid]);

        req.io.emit('ticketUpdate', {
            ticketId: ticketid,
            title: ticketResult.rows[0].title,
            senderName: fullMessage.senderfullname,
            senderId: senderid,
            recipientId: ticketResult.rows[0].createdbyuserid
        });

        res.status(201).json(newMessage);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al enviar el mensaje.');
    }
};

// Marcar mensajes como leídos
exports.markMessagesAsRead = async (req, res) => {
    const ticketid = parseInt(req.params.id, 10);
    const userid = parseInt(req.user.id, 10);

    try {
        const pool = await getConnection();
        await pool.query(`
            UPDATE "TicketMessages"
            SET isread = true
            WHERE ticketid = $1 AND senderid != $2 AND isread = false
        `, [ticketid, userid]);

        req.io.to(ticketid).emit('messagesRead', { readerId: userid });

        res.status(200).json({ msg: 'Mensajes marcados como leídos.' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor.');
    }
};

// Actualizar ticket
exports.updateTicket = async (req, res) => {
    const ticketid = parseInt(req.params.id, 10);
    const userid = parseInt(req.user.id, 10);
    const userrole = req.user.role;
    const { title, description } = req.body;

    if (!title || !description) return res.status(400).json({ msg: 'El título y la descripción son requeridos.' });

    try {
        const pool = await getConnection();
        const ticketResult = await pool.query(`
            SELECT createdbyuserid, status
            FROM "Tickets"
            WHERE ticketid = $1
        `, [ticketid]);

        if (ticketResult.rows.length === 0) return res.status(404).json({ msg: 'Ticket no encontrado.' });

        const ticket = ticketResult.rows[0];

        if (ticket.createdbyuserid !== userid && userrole !== 'Administrador') {
            return res.status(403).json({ msg: 'No tienes permiso para editar este ticket.' });
        }

        if (ticket.status !== 'Abierto') {
            return res.status(403).json({ msg: `No se puede editar un ticket en estado "${ticket.status}".` });
        }

        await pool.query(`
            UPDATE "Tickets"
            SET title = $1, description = $2, updatedat = NOW()
            WHERE ticketid = $3
        `, [title, description, ticketid]);

        res.json({ msg: 'Ticket actualizado correctamente.' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor al actualizar el ticket.');
    }
};

// Cancelar ticket
exports.cancelTicket = async (req, res) => {
    const ticketid = parseInt(req.params.id, 10);
    const userid = parseInt(req.user.id, 10);
    const userrole = req.user.role;

    try {
        const pool = await getConnection();
        const ticketResult = await pool.query(`
            SELECT status, createdbyuserid
            FROM "Tickets"
            WHERE ticketid = $1
        `, [ticketid]);

        if (ticketResult.rows.length === 0) return res.status(404).json({ msg: 'Ticket no encontrado.' });

        const ticket = ticketResult.rows[0];

        if (ticket.status !== 'Abierto') return res.status(403).json({ msg: 'No se puede cancelar un ticket que ya está en proceso.' });
        if (ticket.createdbyuserid !== userid && userrole !== 'Administrador') {
            return res.status(403).json({ msg: 'No tienes permiso para cancelar este ticket.' });
        }

        await pool.query(`
            UPDATE "Tickets"
            SET status = 'Cancelado', updatedat = NOW()
            WHERE ticketid = $1
        `, [ticketid]);

        res.json({ msg: 'Ticket cancelado exitosamente.' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor al cancelar el ticket.');
    }
};
