const { getConnection } = require('../config/db');

exports.getDashboardStats = async (req, res) => {
    const { id: userId, area: userArea } = req.user;

    try {
        const pool = await getConnection(); // <-- aquí usamos getConnection

        const [totalVsOpenResult, ticketFlowResult] = await Promise.all([
            pool.query(`
                SELECT 
                    COUNT(*) AS total, 
                    COUNT(CASE WHEN "Status" IN ('Abierto', 'En Revisión') THEN 1 END) AS "openTickets"
                FROM "Tickets"
                WHERE ("AssignedToArea" = $1 OR "CreatedByUserID" = $2) AND "Status" != 'Cancelado'
            `, [userArea, userId]),

            pool.query(`
                SELECT
                    (SELECT COUNT(*) FROM "Tickets" WHERE "CreatedByUserID" = $1) AS realizados,
                    (SELECT COUNT(*) FROM "Tickets" WHERE "AssignedToArea" = $2) AS recibidos
            `, [userId, userArea])
        ]);

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
        console.error("Error detallado en getDashboardStats:", error);
        res.status(500).send('Error en el servidor al obtener estadísticas.');
    }
};
