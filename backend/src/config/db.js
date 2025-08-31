const sql = require('mssql');
require('dotenv').config();

const dbSettings = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    port: parseInt(process.env.DB_PORT, 10), // Añadimos el puerto aquí
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

const getConnection = async () => {
    try {
        const pool = await sql.connect(dbSettings);
        // Quitamos el console.log de aquí para que no aparezca en cada petición
        return pool;
    } catch (error) {
        console.error("Error al conectar con la base de datos:", error);
        // Lanzamos el error para que el llamador sepa que algo salió mal
        throw error; 
    }
};

// Función para verificar la conexión al iniciar
const checkDbConnection = async () => {
    try {
        const pool = await getConnection();
        console.log("Conexión a la base de datos establecida correctamente.");
        await pool.close();
    } catch (error) {
        console.error("Fallo al verificar la conexión con la base de datos.");
    }
};


module.exports = { 
    getConnection, 
    checkDbConnection, // Exportamos la nueva función
    sql // Exportamos sql para usarlo en las consultas
};