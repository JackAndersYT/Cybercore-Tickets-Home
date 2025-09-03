const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
require('dotenv').config();

module.exports = async function (req, res, next) {
    // Obtener el token del header
    const token = req.header('x-auth-token');

    if (!token) {
        return res.status(401).json({ msg: 'No hay token, permiso no válido' });
    }

    try {
        // Verificar y decodificar el token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Convertir a número si viene como string
        const userId = parseInt(decoded.user.id, 10);

        // Consultar si el usuario existe
        const userResult = await pool.query(
            'SELECT "userid", "role", "area" FROM "Users" WHERE "userid" = $1',
            [userId]
        );

        if (userResult.rowCount === 0) {
            return res.status(401).json({ msg: 'Token no es válido (usuario no existe)' });
        }

        // Guardar datos del usuario en req.user
        req.user = {
            id: userId,
            role: userResult.rows[0].Role,
            area: userResult.rows[0].Area
        };

        next();
    } catch (error) {
        console.error('Error en auth middleware:', error);
        res.status(401).json({ msg: 'Token no es válido' });
    }
};
