"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConnection = void 0;
const promise_1 = __importDefault(require("mysql2/promise"));
async function getConnection() {
    console.log('Intentando conectar a la base de datos');
    try {
        const pool = await promise_1.default.createPool({
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
    }
    catch (error) {
        console.error('Error al conectar con la base de datos:', error);
        throw error;
    }
}
exports.getConnection = getConnection;
//# sourceMappingURL=database.js.map