"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConnection = void 0;
const promise_1 = __importDefault(require("mysql2/promise"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function getConnection() {
    const host = process.env.DB_HOST || 'localhost';
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASSWORD || '';
    const database = process.env.DB_NAME || 'citasmedicas';
    const port = parseInt(process.env.DB_PORT || '3306');
    return await promise_1.default.createPool({
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
exports.getConnection = getConnection;
//# sourceMappingURL=database.js.map