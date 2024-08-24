import mysql from 'mysql2/promise';

export async function getConnection() {
  try {
    const pool = mysql.createPool({
      host: process.env.MYSQLHOST || '',
      user: process.env.MYSQLUSER || '',
      password: process.env.MYSQLPASSWORD || '',
      database: process.env.MYSQL_DATABASE || '',
      port: parseInt(process.env.MYSQLPORT || '3306'),
      connectionLimit: 10,
      ssl: {
        rejectUnauthorized: true
      }
    });

    // Prueba la conexión
    const connection = await pool.getConnection();
    console.log('Conexión a la base de datos establecida correctamente');
    connection.release();
    return pool;
  } catch (error) {
    console.error('Error al conectar con la base de datos:', error);
    throw error;
  }
}