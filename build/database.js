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
    const host = process.env.DB_HOST;
    const user = process.env.DB_USER;
    const password = process.env.DB_PASSWORD;
    const database = process.env.DB_NAME;
    const port = parseInt(process.env.DB_PORT || '3306');
    if (!host || !user || !password || !database) {
        throw new Error('Database configuration is incomplete');
    }
    return await promise_1.default.createPool({
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
exports.getConnection = getConnection;
//# sourceMappingURL=database.js.map