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

        // Asegurarse que el payload del token es correcto
        if (!decoded.user || !decoded.user.UserID) {
            return res.status(401).json({ msg: 'Token no es válido (payload incorrecto)' });
        }

        const userId = parseInt(decoded.user.UserID, 10);

        if (isNaN(userId)) {
            return res.status(401).json({ msg: 'Token no es válido (ID de usuario incorrecto)' });
        }

        // Consultar si el usuario existe para asegurar que el token es de un usuario válido
        const userResult = await pool.query(
            'SELECT UserID, FullName, Role, Area FROM "Users" WHERE UserID = $1',
            [userId]
        );

        if (userResult.rowCount === 0) {
            return res.status(401).json({ msg: 'Token no es válido (usuario no existe)' });
        }

        // Los nombres de columna en la DB son con mayúsculas, pero node-postgres los devuelve en minúsculas.
        const dbUser = userResult.rows[0];

        // Adjuntar la información del usuario al request, manteniendo la consistencia con PascalCase
        req.user = {
            UserID: dbUser.userid,
            FullName: dbUser.fullname,
            Role: dbUser.role,
            Area: dbUser.area
        };

        next();
    } catch (error) {
        console.error('Error en auth middleware:', error);
        res.status(401).json({ msg: 'Token no es válido' });
    }
};