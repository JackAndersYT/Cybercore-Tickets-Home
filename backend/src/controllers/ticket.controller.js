import { getConnection } from '../config/db.js';

// Crear un ticket
export const createTicket = async (req, res) => {
    const { title, description } = req.body;
    const assignedtoarea = req.body.assignedtoarea || req.body.assignedToArea;
    const { UserID: createdbyuserid, CompanyID: companyid } = req.user;

    if (!title || !description || !assignedtoarea) {
        return res.status(400).json({ msg: 'Por favor, complete todos los campos requeridos.' });
    }
    if (!companyid) {
        return res.status(400).json({ msg: 'El usuario no está asociado a ninguna empresa.' });
    }

    try {
        const pool = await getConnection();
        const result = await pool.query(
            `INSERT INTO "Tickets" (title, description, createdbyuserid, assignedtoarea, companyid) 
             VALUES ($1, $2, $3, $4, $5) RETURNING ticketid, assignedtoarea`,
            [title, description, createdbyuserid, assignedtoarea, companyid]
        );
        const newTicket = result.rows[0];
        req.io.emit('ticketCreated', { 
            ticketId: newTicket.ticketid,
            assignedToArea: newTicket.assignedtoarea
        });
        res.status(201).json({ msg: 'Ticket creado exitosamente.', ticket: newTicket });
    } catch (error) {
        console.error('Error en createTicket:', error);
        res.status(500).send('Error en el servidor al crear el ticket.');
    }
};

// Obtener tickets con filtros y paginación (VERSIÓN CORREGIDA)
exports.getTickets = async (req, res) => {
    const { UserID: userId, Area: userArea, CompanyID: companyid } = req.user;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 9;
    const offset = (page - 1) * limit;
    const { searchTerm, status, dateFrom } = req.query;
    let { dateTo } = req.query;

    if (!companyid) {
        return res.status(400).json({ msg: 'El usuario no está asociado a ninguna empresa.' });
    }

    try {
        const pool = await getConnection();
        await pool.query(
            `UPDATE "Tickets" SET status = 'Cerrado', updatedat = NOW() WHERE status = 'Resuelto' AND resolvedat < NOW() - INTERVAL '1 day' AND companyid = $1`,
            [companyid]
        );

        const queryParams = [];
        const conditions = [];

        // 1. Add company filter
        queryParams.push(companyid);
        conditions.push(`t.companyid = $${queryParams.length}`);

        // 2. Add user/area filter
        if (userArea === 'Personal Operativo') {
            queryParams.push(userId);
            conditions.push(`t.createdbyuserid = $${queryParams.length}`);
        } else {
            queryParams.push(userArea, userId);
            conditions.push(`(t.assignedtoarea = $${queryParams.length - 1} OR t.createdbyuserid = $${queryParams.length})`);
        }

        // 3. Add optional filters
        if (searchTerm) {
            queryParams.push(`%${searchTerm}%`);
            conditions.push(`(t.title ILIKE $${queryParams.length} OR t.description ILIKE $${queryParams.length})`);
        }
        if (status && status !== 'Todos') {
            queryParams.push(status);
            conditions.push(`t.status = $${queryParams.length}`);
        }
        if (dateFrom) {
            queryParams.push(dateFrom);
            conditions.push(`t.createdat >= $${queryParams.length}`);
        }
        if (dateTo) {
            const nextDay = new Date(dateTo);
            nextDay.setDate(nextDay.getDate() + 1);
            queryParams.push(nextDay.toISOString().split('T')[0]);
            conditions.push(`t.createdat < $${queryParams.length}`);
        }

        const whereClause = `WHERE ${conditions.join(' AND ')}`;

        const countQuery = `SELECT COUNT(*) AS totaltickets FROM "Tickets" t ${whereClause}`;
        const countResult = await pool.query(countQuery, queryParams);
        const totalTickets = parseInt(countResult.rows[0].totaltickets, 10);
        const totalPages = Math.ceil(totalTickets / limit);

        const ticketsParams = [userId, ...queryParams, offset, limit];
        const ticketsWhereClause = whereClause.replace(/\$(\d+)/g, (_, n) => `$${parseInt(n) + 1}`);

        const ticketsQuery = `
            SELECT 
                t.ticketid AS "TicketID", t.title AS "Title", t.status AS "Status",
                t.createdat AS "CreatedAt", t.description AS "Description", u.fullname AS "CreatedBy",
                (
                    SELECT COUNT(*) FROM "TicketMessages" tm
                    WHERE tm.ticketid = t.ticketid AND tm.isread = false AND tm.senderid != $1
                ) AS "unreadCount"
            FROM "Tickets" t
            JOIN "Users" u ON t.createdbyuserid = u.userid
            ${ticketsWhereClause}
            ORDER BY t.createdat DESC
            OFFSET $${queryParams.length + 2} LIMIT $${queryParams.length + 3}
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
    const { UserID: userid, Area: userarea, CompanyID: companyid, Role: userrole } = req.user;

    if (!companyid) {
        return res.status(400).json({ msg: 'El usuario no está asociado a ninguna empresa.' });
    }

    try {
        const pool = await getConnection();
        const result = await pool.query(`
            SELECT
                t.ticketid AS "TicketID", t.title AS "Title", t.description AS "Description",
                t.status AS "Status", t.createdbyuserid AS "CreatedByUserID", t.assignedtoarea AS "AssignedToArea",
                t.createdat AS "CreatedAt", t.updatedat AS "UpdatedAt", t.resolvedat AS "ResolvedAt",
                u.fullname AS "CreatedByFullName",
                (
                    SELECT COUNT(*) FROM "TicketMessages" tm 
                    WHERE tm.ticketid = t.ticketid AND tm.isread = false AND tm.senderid != $1
                ) AS "unreadCount"
            FROM "Tickets" t
            JOIN "Users" u ON t.createdbyuserid = u.userid
            WHERE t.ticketid = $2 AND t.companyid = $3
        `, [userid, ticketid, companyid]);

        if (result.rows.length === 0) return res.status(404).json({ msg: 'Ticket no encontrado o no pertenece a su empresa.' });

        const ticket = result.rows[0];

        if (userrole !== 'Administrador' && userarea === 'Personal Operativo' && ticket.CreatedByUserID !== userid) {
            return res.status(403).json({ msg: 'Acceso denegado.' });
        }
        if (userrole !== 'Administrador' && userarea !== 'Personal Operativo' && ticket.AssignedToArea !== userarea && ticket.CreatedByUserID !== userid) {
            return res.status(403).json({ msg: 'No tienes permiso para ver este ticket.' });
        }

        res.json(ticket);
    } catch (error) {
        console.error('Error en getTicketById:', error);
        res.status(500).send('Error en el servidor.');
    }
};

// Actualizar estado del ticket
exports.updateTicketStatus = async (req, res) => {
    const ticketid = parseInt(req.params.id, 10);
    const { status } = req.body;
    const { Area: userarea, CompanyID: companyid } = req.user;

    if (!companyid) {
        return res.status(400).json({ msg: 'El usuario no está asociado a ninguna empresa.' });
    }
    if (!['Soporte', 'Contabilidad'].includes(userarea)) {
        return res.status(403).json({ msg: 'No tienes permiso para cambiar el estado.' });
    }

    try {
        const pool = await getConnection();
        const ticketResult = await pool.query(`SELECT assignedtoarea FROM "Tickets" WHERE ticketid = $1 AND companyid = $2`, [ticketid, companyid]);

        if (ticketResult.rows.length === 0) return res.status(404).json({ msg: 'Ticket no encontrado o no pertenece a su empresa.' });

        const ticket = ticketResult.rows[0];
        if (ticket.assignedtoarea !== userarea) return res.status(403).json({ msg: 'No puedes cambiar el estado de un ticket que no está asignado a tu área.' });

        let query = `UPDATE "Tickets" SET status = $1, updatedat = NOW()`;
        const params = [status];

        if (status === 'Resuelto') {
            query += `, resolvedat = NOW()`;
        }
        query += ` WHERE ticketid = $2 AND companyid = $3`;
        params.push(ticketid, companyid);

        await pool.query(query, params);

        req.io.to(String(ticketid)).emit('ticketUpdated', { ticketId: ticketid });
        req.io.emit('ticketUpdated');

        res.json({ msg: 'Estado del ticket actualizado.' });
    } catch (error) {
        console.error('Error en updateTicketStatus:', error);
        res.status(500).send('Error en el servidor.');
    }
};

// Obtener mensajes de un ticket
exports.getTicketMessages = async (req, res) => {
    const ticketid = parseInt(req.params.id, 10);
    const { CompanyID: companyid } = req.user;

    if (!companyid) {
        return res.status(400).json({ msg: 'El usuario no está asociado a ninguna empresa.' });
    }

    try {
        const pool = await getConnection();
        const ticketCheck = await pool.query('SELECT ticketid FROM "Tickets" WHERE ticketid = $1 AND companyid = $2', [ticketid, companyid]);
        if (ticketCheck.rows.length === 0) {
            return res.status(404).json({ msg: 'Ticket no encontrado o no pertenece a su empresa.' });
        }

        const result = await pool.query(`
            SELECT 
                m.messageid AS "MessageID", m.ticketid AS "TicketID", m.senderid AS "SenderID",
                m.messagetext AS "MessageText", m.sentat AS "SentAt", m.isread AS "IsRead",
                m.filename AS "FileName", m.fileurl AS "FileURL", m.filetype AS "FileType",
                u.fullname AS "SenderFullName"
            FROM "TicketMessages" m
            JOIN "Users" u ON m.senderid = u.userid
            WHERE m.ticketid = $1
            ORDER BY m.sentat ASC
        `, [ticketid]);

        res.json(result.rows);
    } catch (error) {
        console.error('Error en getTicketMessages:', error);
        res.status(500).send('Error al obtener los mensajes.');
    }
};

// Agregar mensaje a un ticket
exports.addTicketMessage = async (req, res) => {
    const ticketid = parseInt(req.params.id, 10);
    const { UserID: senderid, CompanyID: companyid } = req.user;
    const { messagetext } = req.body;
    const { file } = req;
    const { socketId } = req.query;

    if (!messagetext && !file) return res.status(400).json({ msg: 'El mensaje no puede estar vacío.' });
    if (!companyid) return res.status(400).json({ msg: 'El usuario no está asociado a ninguna empresa.' });

    try {
        const pool = await getConnection();
        const ticketCheck = await pool.query('SELECT createdbyuserid FROM "Tickets" WHERE ticketid = $1 AND companyid = $2', [ticketid, companyid]);
        if (ticketCheck.rows.length === 0) {
            return res.status(403).json({ msg: 'No tiene permiso para interactuar con este ticket.' });
        }

        const filename = file ? file.originalname : null;
        const fileurl = file ? `/uploads/${file.filename}` : null;
        const filetype = file ? file.mimetype : null;

        const insertResult = await pool.query(`
            INSERT INTO "TicketMessages" (ticketid, senderid, messagetext, filename, fileurl, filetype)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING 
                messageid AS "MessageID",
                ticketid AS "TicketID",
                senderid AS "SenderID",
                messagetext AS "MessageText",
                sentat AS "SentAt",
                isread AS "IsRead",
                filename AS "FileName",
                fileurl AS "FileURL",
                filetype AS "FileType"
        `, [ticketid, senderid, messagetext || null, filename, fileurl, filetype]);

        const newMessage = insertResult.rows[0];

        const userResult = await pool.query(`SELECT fullname FROM "Users" WHERE userid = $1`, [senderid]);

        const fullMessage = {
            ...newMessage,
            SenderFullName: userResult.rows[0].fullname
        };

        const roomName = String(ticketid);
        const senderSocket = req.io.sockets.sockets.get(socketId);
        if (senderSocket) {
            senderSocket.broadcast.to(roomName).emit('newMessage', fullMessage);
        } else {
            req.io.to(roomName).emit('newMessage', fullMessage);
        }

        req.io.emit('ticketUpdate', {
            ticketId: ticketid,
            senderId: senderid,
            recipientId: ticketCheck.rows[0].createdbyuserid
        });

        res.status(201).json(fullMessage);
    } catch (error) {
        console.error('Error en addTicketMessage:', error);
        res.status(500).send('Error al enviar el mensaje.');
    }
};

// Marcar mensajes como leídos
exports.markMessagesAsRead = async (req, res) => {
    const ticketid = parseInt(req.params.id, 10);
    const { UserID: userid, CompanyID: companyid } = req.user;

    if (!companyid) {
        return res.status(400).json({ msg: 'El usuario no está asociado a ninguna empresa.' });
    }

    try {
        const pool = await getConnection();
        await pool.query(`
            UPDATE "TicketMessages"
            SET isread = true
            WHERE ticketid = $1 AND senderid != $2 AND isread = false
              AND ticketid IN (SELECT ticketid FROM "Tickets" WHERE ticketid = $1 AND companyid = $3)
        `, [ticketid, userid, companyid]);

        req.io.to(String(ticketid)).emit('messagesRead', { readerId: userid });
        res.status(200).json({ msg: 'Mensajes marcados como leídos.' });
    } catch (error) {
        console.error('Error en markMessagesAsRead:', error);
        res.status(500).send('Error en el servidor.');
    }
};

// Actualizar ticket
exports.updateTicket = async (req, res) => {
    const ticketid = parseInt(req.params.id, 10);
    const { UserID: userid, Role: userrole, CompanyID: companyid } = req.user;
    const { title, description } = req.body;

    if (!title || !description) return res.status(400).json({ msg: 'El título y la descripción son requeridos.' });
    if (!companyid) return res.status(400).json({ msg: 'El usuario no está asociado a ninguna empresa.' });

    try {
        const pool = await getConnection();
        const ticketResult = await pool.query(
            `SELECT createdbyuserid, status FROM "Tickets" WHERE ticketid = $1 AND companyid = $2`,
            [ticketid, companyid]
        );

        if (ticketResult.rows.length === 0) return res.status(404).json({ msg: 'Ticket no encontrado o no pertenece a su empresa.' });

        const ticket = ticketResult.rows[0];
        if (ticket.createdbyuserid !== userid && userrole !== 'Administrador') {
            return res.status(403).json({ msg: 'No tienes permiso para editar este ticket.' });
        }
        if (ticket.status !== 'Abierto') {
            return res.status(403).json({ msg: `No se puede editar un ticket en estado "${ticket.status}".` });
        }

        await pool.query(
            `UPDATE "Tickets" SET title = $1, description = $2, updatedat = NOW() WHERE ticketid = $3 AND companyid = $4`,
            [title, description, ticketid, companyid]
        );

        req.io.to(String(ticketid)).emit('ticketUpdated', { ticketId: ticketid });
        req.io.emit('ticketUpdated');
        res.json({ msg: 'Ticket actualizado correctamente.' });
    } catch (error) {
        console.error('Error en updateTicket:', error);
        res.status(500).send('Error en el servidor.');
    }
};

// Cancelar ticket
exports.cancelTicket = async (req, res) => {
    const ticketid = parseInt(req.params.id, 10);
    const { UserID: userid, Role: userrole, CompanyID: companyid } = req.user;

    if (!companyid) {
        return res.status(400).json({ msg: 'El usuario no está asociado a ninguna empresa.' });
    }

    try {
        const pool = await getConnection();
        const ticketResult = await pool.query(
            `SELECT status, createdbyuserid FROM "Tickets" WHERE ticketid = $1 AND companyid = $2`,
            [ticketid, companyid]
        );

        if (ticketResult.rows.length === 0) return res.status(404).json({ msg: 'Ticket no encontrado o no pertenece a su empresa.' });

        const ticket = ticketResult.rows[0];
        if (ticket.status !== 'Abierto') return res.status(403).json({ msg: 'No se puede cancelar un ticket que ya está en proceso.' });
        if (ticket.createdbyuserid !== userid && userrole !== 'Administrador') {
            return res.status(403).json({ msg: 'No tienes permiso para cancelar este ticket.' });
        }

        await pool.query(
            `UPDATE "Tickets" SET status = 'Cancelado', updatedat = NOW() WHERE ticketid = $1 AND companyid = $2`,
            [ticketid, companyid]
        );

        req.io.to(String(ticketid)).emit('ticketUpdated', { ticketId: ticketid });
        req.io.emit('ticketUpdated');
        res.json({ msg: 'Ticket cancelado exitosamente.' });
    } catch (error) {
        console.error('Error en cancelTicket:', error);
        res.status(500).send('Error en el servidor al cancelar el ticket.');
    }
};