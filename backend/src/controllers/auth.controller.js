import { pool } from '../config/db.js';
import bcrypt from 'bcryptjs';

exports.registerCompany = async (req, res) => {
    const { companyName, adminFullName, adminUsername, adminPassword } = req.body;

    // Basic validation
    if (!companyName || !adminFullName || !adminUsername || !adminPassword) {
        return res.status(400).json({ msg: 'Por favor, ingrese todos los campos requeridos.' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Check if company name already exists
        const companyCheck = await client.query('SELECT * FROM "Companies" WHERE name = $1', [companyName]);
        if (companyCheck.rows.length > 0) {
            throw new Error('El nombre de la empresa ya está registrado.');
        }

        // 2. Check if admin username already exists
        const userCheck = await client.query('SELECT * FROM "Users" WHERE username = $1', [adminUsername]);
        if (userCheck.rows.length > 0) {
            throw new Error('El nombre de usuario ya está en uso.');
        }

        // 3. Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        // 4. Insert new company
        const newCompany = await client.query('INSERT INTO "Companies" (name) VALUES ($1) RETURNING companyid', [companyName]);
        const companyId = newCompany.rows[0].companyid;

        // 5. Insert admin user
        await client.query(
            'INSERT INTO "Users" (fullname, username, passwordhash, role, area, companyid) VALUES ($1, $2, $3, $4, $5, $6)',
            [adminFullName, adminUsername, hashedPassword, 'Administrador', 'Soporte', companyId]
        );

        await client.query('COMMIT');
        res.status(201).json({ msg: 'Empresa y usuario administrador registrados con éxito.' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error en registerCompany:', err.message);
        res.status(500).json({ msg: err.message || 'Error en el servidor al registrar la empresa.' });
    } finally {
        client.release();
    }
};