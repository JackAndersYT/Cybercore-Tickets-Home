import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

// Configuración de la base de datos
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
};

// En producción (por ejemplo en Render), usa SSL. En desarrollo, no.
if (process.env.NODE_ENV === 'production') {
  console.log("Usando configuración de base de datos para producción (con SSL).");
  dbConfig.ssl = { rejectUnauthorized: false }; // obligatorio en Render
} else {
  console.log("Usando configuración de base de datos para desarrollo (sin SSL).");
}

const pool = new Pool(dbConfig);

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