const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
require('dotenv').config();

module.exports = async function(req, res, next) {
    // Obtener el token del header
    const token = req.header('x-auth-token');

    // Verificar si no hay token
    if (!token) {
        return res.status(401).json({ msg: 'No hay token, permiso no válido' });
    }

    // Validar el token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Consulta a PostgreSQL
        const userResult = await pool.query(
            'SELECT userid FROM Users WHERE userid = $1',
            [decoded.user.id]
        );

        if (userResult.rowCount === 0) {
            return res.status(401).json({ msg: 'Token no es válido (usuario no existe)' });
        }

        req.user = decoded.user;
        next();
    } catch (error) {
        res.status(401).json({ msg: 'Token no es válido' });
    }
};