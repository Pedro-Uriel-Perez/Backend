"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConnection = void 0;
const promise_1 = __importDefault(require("mysql2/promise"));
async function getConnection() {
    try {
        const pool = promise_1.default.createPool({
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
    }
    catch (error) {
        console.error('Error al conectar con la base de datos:', error);
        throw error;
    }
}
exports.getConnection = getConnection;
//# sourceMappingURL=database.js.map