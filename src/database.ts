import mysql from 'mysql2/promise';
export async function getConnection() {
    console.log('Intentando conectar a la base de datos');
    try {
      const pool = await mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT || '3306'),
        ssl: {
          rejectUnauthorized: true
        }
      });
      console.log('Conexión Exitosa');
      return pool;
    } catch (error) {
      console.error('Error al conectar con la base de datos:', error);
      throw error;
    }
  }