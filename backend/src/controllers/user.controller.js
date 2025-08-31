const { getConnection, sql } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

exports.registerUser = async (req, res) => {
    const { fullName, username, password, role, area } = req.body;

    // Validación básica
    if (!fullName || !username || !password || !role || !area) {
        return res.status(400).json({ msg: "Por favor, complete todos los campos." });
    }

    try {
        const pool = await getConnection();

        // Hashear la contraseña
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        await pool.request()
            .input('fullName', sql.NVarChar, fullName)
            .input('username', sql.NVarChar, username)
            .input('passwordHash', sql.NVarChar, passwordHash)
            .input('role', sql.NVarChar, role)
            .input('area', sql.NVarChar, area)
            .query('INSERT INTO Users (FullName, Username, PasswordHash, Role, Area) VALUES (@fullName, @username, @passwordHash, @role, @area)');

        res.status(201).json({ msg: "Usuario registrado exitosamente." });
    } catch (error) {
        // Manejo de error para usuario duplicado
        if (error.number === 2627 || error.number === 2601) { // Códigos de error para violación de UNIQUE constraint
             return res.status(409).json({ msg: "El nombre de usuario ya existe." });
        }
        console.error(error);
        res.status(500).send('Error en el servidor');
    }
};

// ... (debajo de la función registerUser)
exports.loginUser = async (req, res) => {
    const { username, password } = req.body;

    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .query('SELECT * FROM Users WHERE Username = @username');

        const user = result.recordset[0];

        if (!user) {
            return res.status(400).json({ msg: "Credenciales inválidas." });
        }

        const isMatch = await bcrypt.compare(password, user.PasswordHash);

        if (!isMatch) {
            return res.status(400).json({ msg: "Credenciales inválidas." });
        }

        const payload = {
            user: {
                id: user.UserID,
                role: user.Role,
                area: user.Area
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '8h' },
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );

    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor');
    }
};
exports.getLoggedInUser = async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('userId', sql.Int, req.user.id)
            .query('SELECT UserID, FullName, Username, Role, Area FROM Users WHERE UserID = @userId');

        res.json(result.recordset[0]);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor');
    }
};
exports.getAllUsers = async (req, res) => {
    // 1. Obtener parámetros de la URL, con valores por defecto
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 6; // Mostraremos 6 usuarios por página
    const offset = (page - 1) * limit;

    try {
        const pool = await getConnection();
        
        // 2. Ejecutar dos consultas en paralelo: una para los datos y otra para el conteo total
        const [usersResult, countResult] = await Promise.all([
            pool.request()
                .input('limit', sql.Int, limit)
                .input('offset', sql.Int, offset)
                .query(`
                    SELECT UserID, FullName, Username, Role, Area 
                    FROM Users 
                    ORDER BY UserID 
                    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
                `),
            pool.request().query('SELECT COUNT(*) as totalUsers FROM Users')
        ]);
        
        const totalUsers = countResult.recordset[0].totalUsers;
        const totalPages = Math.ceil(totalUsers / limit);

        // 3. Devolver un objeto con los usuarios de la página y la información de paginación
        res.json({
            users: usersResult.recordset,
            totalPages,
            currentPage: page
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor.');
    }
};

// Actualizar un usuario
exports.updateUser = async (req, res) => {
    const { id: userIdToUpdate } = req.params;
    const { fullName, role, area } = req.body;

    try {
        const pool = await getConnection();
        await pool.request()
            .input('UserID', sql.Int, userIdToUpdate)
            .input('FullName', sql.NVarChar, fullName)
            .input('Role', sql.NVarChar, role)
            .input('Area', sql.NVarChar, area)
            .query('UPDATE Users SET FullName = @FullName, Role = @Role, Area = @Area WHERE UserID = @UserID');

        res.json({ msg: 'Usuario actualizado correctamente.' });
    } catch (error) {
        res.status(500).send('Error en el servidor.');
    }
};

// Eliminar un usuario
exports.deleteUser = async (req, res) => {
    const { id: userIdToDelete } = req.params;
    const { id: adminUserId, role: adminUserRole } = req.user;

    if (adminUserRole !== 'Administrador') {
        return res.status(403).json({ msg: 'No tienes permiso para eliminar usuarios.' });
    }
    if (parseInt(userIdToDelete, 10) === adminUserId) {
        return res.status(400).json({ msg: 'No puedes eliminar tu propia cuenta.' });
    }

    try {
        const pool = await getConnection();
        // Opcional: Verificar que el usuario a eliminar no sea otro admin
        const userToDeleteResult = await pool.request().input('UserID', sql.Int, userIdToDelete).query('SELECT Role FROM Users WHERE UserID = @UserID');
        if (userToDeleteResult.recordset[0]?.Role === 'Administrador') {
            return res.status(403).json({ msg: 'No se puede eliminar a otro administrador.' });
        }

        await pool.request().input('UserID', sql.Int, userIdToDelete).query('DELETE FROM Users WHERE UserID = @UserID');
        res.json({ msg: 'Usuario eliminado.' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor.');
    }
};
exports.updatePassword = async (req, res) => {
    const { id: userIdToUpdate } = req.params;
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ msg: 'La nueva contraseña es requerida.' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const pool = await getConnection();
        await pool.request()
            .input('UserID', sql.Int, userIdToUpdate)
            .input('PasswordHash', sql.NVarChar, passwordHash)
            .query('UPDATE Users SET PasswordHash = @PasswordHash WHERE UserID = @UserID');

        res.json({ msg: 'Contraseña actualizada correctamente.' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor al actualizar la contraseña.');
    }
};