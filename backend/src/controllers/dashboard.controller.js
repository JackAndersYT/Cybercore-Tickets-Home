const { getConnection, sql } = require('../config/db');

exports.getDashboardStats = async (req, res) => {
    const { id: userId, area: userArea } = req.user;

    try {
        const pool = await getConnection();
        const request = pool.request();
        request.input('userId', sql.Int, userId);
        request.input('userArea', sql.NVarChar, userArea);

        // Ejecutar todas las consultas de estadísticas en paralelo
        const [totalVsOpenResult, ticketFlowResult] = await Promise.all([
            // Consulta para el estado general (total vs abiertos)
            request.query(`
                SELECT 
                    (SELECT COUNT(*) FROM Tickets WHERE AssignedToArea = @userArea OR CreatedByUserID = @userId) as total, 
                    (SELECT COUNT(*) FROM Tickets WHERE (AssignedToArea = @userArea OR CreatedByUserID = @userId) AND Status IN ('Abierto', 'En Revisión')) as openTickets
            `),
            // Consulta para tickets realizados vs recibidos
            request.query(`
                SELECT
                    (SELECT COUNT(*) FROM Tickets WHERE CreatedByUserID = @userId) as realizados,
                    (SELECT COUNT(*) FROM Tickets WHERE AssignedToArea = @userArea) as recibidos
            `)
        ]);

        const totalVsOpenData = totalVsOpenResult.recordset[0] || { total: 0, openTickets: 0 };
        const ticketFlowData = ticketFlowResult.recordset[0] || { realizados: 0, recibidos: 0 };

        res.json({
            totalVsOpen: totalVsOpenData,
            ticketFlow: ticketFlowData // Se envía el nuevo dato
        });

    } catch (error) {
        console.error("Error detallado en getDashboardStats:", error);
        res.status(500).send('Error en el servidor al obtener estadísticas.');
    }
};
