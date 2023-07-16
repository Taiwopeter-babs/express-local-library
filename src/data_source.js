const { DataSource } = require("typeorm");
require('dotenv').config();
const UserEntity = require("./entities/userModel");

/**
 * sets up database connection
 **/
const datasource = new DataSource({
    type: "mysql",
    host: process.env.HOST,
    port: process.env.DB_PORT,
    username: process.env.USERNAME,
    password: process.env.PASSWORD,
    database: process.env.DATABASE,
    entities: [UserEntity],
    // creates the database schema on every application launch. should be used in dev
    // synchronize: true
})

module.exports = datasource;