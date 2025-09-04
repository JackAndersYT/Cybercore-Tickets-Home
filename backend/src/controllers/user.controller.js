const { getConnection } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Registrar usuario
exports.registerUser = async (req, res) => {
    const { fullname, username, password, role, area } = req.body;

    if (!fullname || !username || !password || !role || !area) {
        return res.status(400).json({ msg: "Por favor, complete todos los campos." });
    }

    try {
        const pool = await getConnection();
        const salt = await bcrypt.genSalt(10);
        const passwordhash = await bcrypt.hash(password, salt);

        await pool.query(
            `INSERT INTO "Users" (fullname, username, passwordhash, role, area)
             VALUES ($1, $2, $3, $4, $5)`,
            [fullname, username, passwordhash, role, area]
        );

        res.status(201).json({ msg: "Usuario registrado exitosamente." });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ msg: "El nombre de usuario ya existe." });
        }
        console.error(error);
        res.status(500).send('Error en el servidor');
    }
};

// Login de usuario
exports.loginUser = async (req, res) => {
    const { username, password } = req.body;

    try {
        const pool = await getConnection();
        const result = await pool.query(
            `SELECT * FROM "Users" WHERE username = $1`,
            [username]
        );

        const user = result.rows[0];
        if (!user) return res.status(400).json({ msg: "Credenciales inválidas." });

        const isMatch = await bcrypt.compare(password, user.passwordhash);
        if (!isMatch) return res.status(400).json({ msg: "Credenciales inválidas." });

        // Frontend expects PascalCase properties.
        // node-postgres returns lowercase properties from DB (e.g., user.userid, user.fullname)
        const payload = {
            user: {
                UserID: user.userid,
                FullName: user.fullname,
                Role: user.role,
                Area: user.area
            }
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
        res.json({ token });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor');
    }
};

// Obtener usuario logueado
exports.getLoggedInUser = async (req, res) => {
    const userid = parseInt(req.user.UserID, 10);
    try {
        const pool = await getConnection();
        const result = await pool.query(
            `SELECT 
                userid AS "UserID", 
                fullname AS "FullName", 
                username AS "Username", 
                role AS "Role", 
                area AS "Area" 
             FROM "Users" WHERE userid = $1`,
            [userid]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor');
    }
};

// Obtener todos los usuarios (paginación)
exports.getAllUsers = async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 6;
    const offset = (page - 1) * limit;

    try {
        const pool = await getConnection();
        const [usersResult, countResult] = await Promise.all([
            pool.query(
                `SELECT userid, fullname, username, role, area
                 FROM "Users"
                 ORDER BY userid
                 OFFSET $1 LIMIT $2`,
                [offset, limit]
            ),
            pool.query(`SELECT COUNT(*) as totalusers FROM "Users"`)
        ]);

        const totalUsers = parseInt(countResult.rows[0].totalusers, 10);
        const totalPages = Math.ceil(totalUsers / limit);

        res.json({
            users: usersResult.rows,
            totalPages,
            currentPage: page
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor.');
    }
};

// Actualizar usuario
exports.updateUser = async (req, res) => {
    const useridToUpdate = parseInt(req.params.id, 10);
    const { fullname, role, area } = req.body;

    try {
        const pool = await getConnection();
        await pool.query(
            `UPDATE "Users"
             SET fullname = $1, role = $2, area = $3
             WHERE userid = $4`,
            [fullname, role, area, useridToUpdate]
        );
        res.json({ msg: 'Usuario actualizado correctamente.' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor.');
    }
};

// Eliminar usuario
exports.deleteUser = async (req, res) => {
    const useridToDelete = parseInt(req.params.id, 10);
    const adminuserid = parseInt(req.user.UserID, 10);
    const adminuserrole = req.user.Role;

    if (adminuserrole !== 'Administrador') {
        return res.status(403).json({ msg: 'No tienes permiso para eliminar usuarios.' });
    }
    if (useridToDelete === adminuserid) {
        return res.status(400).json({ msg: 'No puedes eliminar tu propia cuenta.' });
    }

    try {
        const pool = await getConnection();
        const userToDeleteResult = await pool.query(
            `SELECT role FROM "Users" WHERE userid = $1`,
            [useridToDelete]
        );

        if (userToDeleteResult.rows[0]?.role === 'Administrador') {
            return res.status(403).json({ msg: 'No se puede eliminar a otro administrador.' });
        }

        await pool.query(`DELETE FROM "Users" WHERE userid = $1`, [useridToDelete]);
        res.json({ msg: 'Usuario eliminado.' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor.');
    }
};

// Actualizar contraseña
exports.updatePassword = async (req, res) => {
    const useridToUpdate = parseInt(req.params.id, 10);
    const { password } = req.body;

    if (!password) return res.status(400).json({ msg: 'La nueva contraseña es requerida.' });

    try {
        const pool = await getConnection();
        const salt = await bcrypt.genSalt(10);
        const passwordhash = await bcrypt.hash(password, salt);

        await pool.query(
            `UPDATE "Users" SET passwordhash = $1 WHERE userid = $2`,
            [passwordhash, useridToUpdate]
        );

        res.json({ msg: 'Contraseña actualizada correctamente.' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor al actualizar la contraseña.');
    }
};
