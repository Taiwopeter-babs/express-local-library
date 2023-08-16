-- Add a new column to the database table
USE local_lib_db;

ALTER TABLE users
ADD COLUMN `valid_email` BOOLEAN DEFAULT 0 AFTER email;
