-- Creates the user schema
USE local_lib_db;

CREATE TABLE IF NOT EXISTS users (
    `id` VARCHAR(100) NOT NULL PRIMARY KEY,
    `first_name` VARCHAR(100) NOT NULL,
    `last_name` VARCHAR(100) NOT NULL,
    `birthday` DATE NOT NULL,
    `favorite_quote` VARCHAR(256),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);