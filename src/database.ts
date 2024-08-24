import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export async function getConnection() {
  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'citasmedicas';
  const port = parseInt(process.env.DB_PORT || '3306');

  return await mysql.createPool({
    host,
    user,
    password,
    database,
    port,
    connectionLimit: 10,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: true
    } : undefined
  });
}