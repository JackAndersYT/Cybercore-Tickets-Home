import { getConnection } from '../config/db.js';

exports.getDashboardStats = async (req, res) => {
    const { UserID: userId, Area: userArea, CompanyID: companyid } = req.user;

    if (!companyid) {
        return res.status(400).json({ msg: 'El usuario no está asociado a ninguna empresa.' });
    }

    try {
        const pool = await getConnection();

        let totalVsOpenQuery;
        let totalVsOpenParams;

        if (userArea === 'Personal Operativo') {
            totalVsOpenQuery = `
                SELECT 
                    COUNT(*) AS total, 
                    COUNT(CASE WHEN status IN ('Abierto', 'En Revisión') THEN 1 END) AS openTickets
                FROM "Tickets"
                WHERE createdbyuserid = $1 AND status != 'Cancelado' AND companyid = $2
            `;
            totalVsOpenParams = [userId, companyid];
        } else {
            totalVsOpenQuery = `
                SELECT 
                    COUNT(*) AS total, 
                    COUNT(CASE WHEN status IN ('Abierto', 'En Revisión') THEN 1 END) AS openTickets
                FROM "Tickets"
                WHERE (assignedtoarea = $1 OR createdbyuserid = $2) AND status != 'Cancelado' AND companyid = $3
            `;
            totalVsOpenParams = [userArea, userId, companyid];
        }

        const totalVsOpenResult = await pool.query(totalVsOpenQuery, totalVsOpenParams);

        const ticketFlowResult = await pool.query(`
            SELECT
                (SELECT COUNT(*) FROM "Tickets" WHERE createdbyuserid = $1 AND companyid = $3) AS realizados,
                (SELECT COUNT(*) FROM "Tickets" WHERE assignedtoarea = $2 AND companyid = $3) AS recibidos
        `, [userId, userArea, companyid]);

        const totalVsOpenData = totalVsOpenResult.rows[0] || { total: 0, openTickets: 0 };
        const ticketFlowData = ticketFlowResult.rows[0] || { realizados: 0, recibidos: 0 };

        res.json({
            totalVsOpen: {
                total: parseInt(totalVsOpenData.total, 10),
                openTickets: parseInt(totalVsOpenData.openTickets, 10)
            },
            ticketFlow: {
                realizados: parseInt(ticketFlowData.realizados, 10),
                recibidos: parseInt(ticketFlowData.recibidos, 10)
            }
        });

    } catch (error) {
        console.error("Error en getDashboardStats:", error);
        res.status(500).send('Error en el servidor al obtener estadísticas.');
    }
};

exports.getDashboardStats = async (req, res) => {
    const { UserID: userId, Area: userArea, CompanyID: companyid } = req.user; // Use PascalCase

    if (!companyid) {
        return res.status(400).json({ msg: 'El usuario no está asociado a ninguna empresa.' });
    }

    try {
        const pool = await getConnection();

        let totalVsOpenQuery;
        let totalVsOpenParams;

        if (userArea === 'Personal Operativo') {
            totalVsOpenQuery = `
                SELECT 
                    COUNT(*) AS total, 
                    COUNT(CASE WHEN status IN ('Abierto', 'En Revisión') THEN 1 END) AS openTickets
                FROM "Tickets"
                WHERE createdbyuserid = $1 AND status != 'Cancelado' AND companyid = $2
            `;
            totalVsOpenParams = [userId, companyid];
        } else {
            totalVsOpenQuery = `
                SELECT 
                    COUNT(*) AS total, 
                    COUNT(CASE WHEN status IN ('Abierto', 'En Revisión') THEN 1 END) AS openTickets
                FROM "Tickets"
                WHERE (assignedtoarea = $1 OR createdbyuserid = $2) AND status != 'Cancelado' AND companyid = $3
            `;
            totalVsOpenParams = [userArea, userId, companyid];
        }

        const totalVsOpenResult = await pool.query(totalVsOpenQuery, totalVsOpenParams);

        // Obtener flujo de tickets: realizados y recibidos, scoped by company
        const ticketFlowResult = await pool.query(`
            SELECT
                (SELECT COUNT(*) FROM "Tickets" WHERE createdbyuserid = $1 AND companyid = $3) AS realizados,
                (SELECT COUNT(*) FROM "Tickets" WHERE assignedtoarea = $2 AND companyid = $3) AS recibidos
        `, [userId, userArea, companyid]);

        const totalVsOpenData = totalVsOpenResult.rows[0] || { total: 0, openTickets: 0 };
        const ticketFlowData = ticketFlowResult.rows[0] || { realizados: 0, recibidos: 0 };

        res.json({
            totalVsOpen: {
                total: parseInt(totalVsOpenData.total, 10),
                openTickets: parseInt(totalVsOpenData.openTickets, 10)
            },
            ticketFlow: {
                realizados: parseInt(ticketFlowData.realizados, 10),
                recibidos: parseInt(ticketFlowData.recibidos, 10)
            }
        });

    } catch (error) {
        console.error("Error en getDashboardStats:", error);
        res.status(500).send('Error en el servidor al obtener estadísticas.');
    }
};
