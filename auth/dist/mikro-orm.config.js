"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const postgresql_1 = require("@mikro-orm/postgresql");
exports.default = (0, postgresql_1.defineConfig)({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    dbName: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    entities: ['./dist/**/*.entity.js'],
    entitiesTs: ['./src/**/*.entity.ts'],
    debug: false,
    driverOptions: {
        connection: {
            statement_timeout: 5000,
        },
    }
});
//# sourceMappingURL=mikro-orm.config.js.map