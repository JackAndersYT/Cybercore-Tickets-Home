const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = function (req, res, next) {
    // Obtener el token del header
    const token = req.header('x-auth-token');

    if (!token) {
        return res.status(401).json({ msg: 'No hay token, permiso no válido' });
    }

    try {
        // Verificar y decodificar el token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // El payload del token ahora contiene toda la información necesaria, incluido el CompanyID.
        // Nos ahorramos una consulta a la base de datos en cada petición.
        if (!decoded.user || !decoded.user.UserID || !decoded.user.CompanyID) {
            return res.status(401).json({ msg: 'Token no es válido (payload incorrecto)' });
        }

        // Adjuntar el payload del usuario directamente al objeto req
        req.user = decoded.user;

        next();
    } catch (error) {
        console.error('Error en auth middleware:', error);
        res.status(401).json({ msg: 'Token no es válido' });
    }
};