const { getConnection } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

exports.registerUser = async (req, res) => {
    const { fullName, username, password, role, area } = req.body;

    if (!fullName || !username || !password || !role || !area) {
        return res.status(400).json({ msg: "Por favor, complete todos los campos." });
    }

    try {
        const pool = await getConnection();
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        await pool.query(
            `INSERT INTO "Users" ("FullName", "Username", "PasswordHash", "Role", "Area")
             VALUES ($1, $2, $3, $4, $5)`,
            [fullName, username, passwordHash, role, area]
        );

        res.status(201).json({ msg: "Usuario registrado exitosamente." });
    } catch (error) {
        if (error.code === '23505') { // UNIQUE violation
            return res.status(409).json({ msg: "El nombre de usuario ya existe." });
        }
        console.error(error);
        res.status(500).send('Error en el servidor');
    }
};

exports.loginUser = async (req, res) => {
    const { username, password } = req.body;

    try {
        const pool = await getConnection();
        const result = await pool.query(
            `SELECT * FROM "Users" WHERE "Username" = $1`,
            [username]
        );

        const user = result.rows[0];
        if (!user) return res.status(400).json({ msg: "Credenciales inválidas." });

        const isMatch = await bcrypt.compare(password, user.PasswordHash);
        if (!isMatch) return res.status(400).json({ msg: "Credenciales inválidas." });

        const payload = {
            user: {
                id: user.UserID,
                role: user.Role,
                area: user.Area
            }
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
        res.json({ token });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor');
    }
};

exports.getLoggedInUser = async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.query(
            `SELECT "UserID", "FullName", "Username", "Role", "Area" FROM "Users" WHERE "UserID" = $1`,
            [req.user.id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor');
    }
};

exports.getAllUsers = async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 6;
    const offset = (page - 1) * limit;

    try {
        const pool = await getConnection();
        const [usersResult, countResult] = await Promise.all([
            pool.query(
                `SELECT "UserID", "FullName", "Username", "Role", "Area"
                 FROM "Users"
                 ORDER BY "UserID"
                 OFFSET $1 LIMIT $2`,
                [offset, limit]
            ),
            pool.query(`SELECT COUNT(*) as "totalUsers" FROM "Users"`)
        ]);

        const totalUsers = parseInt(countResult.rows[0].totalUsers, 10);
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

exports.updateUser = async (req, res) => {
    const { id: userIdToUpdate } = req.params;
    const { fullName, role, area } = req.body;

    try {
        const pool = await getConnection();
        await pool.query(
            `UPDATE "Users"
             SET "FullName" = $1, "Role" = $2, "Area" = $3
             WHERE "UserID" = $4`,
            [fullName, role, area, userIdToUpdate]
        );
        res.json({ msg: 'Usuario actualizado correctamente.' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor.');
    }
};

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
        const userToDeleteResult = await pool.query(
            `SELECT "Role" FROM "Users" WHERE "UserID" = $1`,
            [userIdToDelete]
        );

        if (userToDeleteResult.rows[0]?.Role === 'Administrador') {
            return res.status(403).json({ msg: 'No se puede eliminar a otro administrador.' });
        }

        await pool.query(`DELETE FROM "Users" WHERE "UserID" = $1`, [userIdToDelete]);
        res.json({ msg: 'Usuario eliminado.' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor.');
    }
};

exports.updatePassword = async (req, res) => {
    const { id: userIdToUpdate } = req.params;
    const { password } = req.body;

    if (!password) return res.status(400).json({ msg: 'La nueva contraseña es requerida.' });

    try {
        const pool = await getConnection();
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        await pool.query(
            `UPDATE "Users" SET "PasswordHash" = $1 WHERE "UserID" = $2`,
            [passwordHash, userIdToUpdate]
        );

        res.json({ msg: 'Contraseña actualizada correctamente.' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor al actualizar la contraseña.');
    }
};
