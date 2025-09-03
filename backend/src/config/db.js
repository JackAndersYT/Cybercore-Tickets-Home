import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

// Configuración de la base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Render te da esta URL
  ssl: { rejectUnauthorized: false } // obligatorio en Render
});

// Función para obtener conexión
const getConnection = async () => {
  try {
    return pool;
  } catch (error) {
    console.error("Error al obtener la conexión con la base de datos:", error);
    throw error;
  }
};

// Función para verificar la conexión al iniciar
const checkDbConnection = async () => {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log("Conexión a la base de datos establecida correctamente:", res.rows[0]);
  } catch (error) {
    console.error("Fallo al verificar la conexión con la base de datos:", error);
  }
};

export { getConnection, checkDbConnection, pool };
