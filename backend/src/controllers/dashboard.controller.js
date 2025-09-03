const { getConnection } = require('../config/db');

exports.getDashboardStats = async (req, res) => {
    const { id: userId, area: userArea } = req.user;

    try {
        const pool = await getConnection();

        // Obtener total de tickets y tickets abiertos
        const totalVsOpenResult = await pool.query(`
            SELECT 
                COUNT(*) AS total, 
                COUNT(CASE WHEN status IN ('Abierto', 'En Revisión') THEN 1 END) AS openTickets
            FROM "Tickets"
            WHERE (assignedtoarea = $1 OR createdbyuserid = $2) AND status != 'Cancelado'
        `, [userArea, userId]);

        // Obtener flujo de tickets: realizados y recibidos
        const ticketFlowResult = await pool.query(`
            SELECT
                (SELECT COUNT(*) FROM "Tickets" WHERE createdbyuserid = $1) AS realizados,
                (SELECT COUNT(*) FROM "Tickets" WHERE assignedtoarea = $2) AS recibidos
        `, [userId, userArea]);

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
