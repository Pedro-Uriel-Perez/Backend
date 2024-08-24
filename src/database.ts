import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export async function getConnection() {
    const host = process.env.DB_HOST;
    const user = process.env.DB_USER;
    const password = process.env.DB_PASSWORD;
    const database = process.env.DB_NAME;
    const port = parseInt(process.env.DB_PORT || '3306');

    if (!host || !user || !password || !database) {
        throw new Error('Database configuration is incomplete');
    }

    return await mysql.createPool({
        host,
        user,
        password,
        database,
        port,
        connectionLimit: 10,
        ssl: {
            rejectUnauthorized: true
        }
    });
}