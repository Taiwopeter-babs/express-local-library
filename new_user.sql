CREATE DATABASE IF NOT EXISTS local_lib_db;

CREATE USER IF NOT EXISTS 'local_lib_user'@'localhost' IDENTIFIED BY 'local_lib_pwd';

GRANT ALL PRIVILEGES ON local_lib_db.* TO 'local_lib_user'@'localhost';
-- GRANT CREATE, DROP, REFERENCES, ALTER ON *.* TO 'local_lib_user'@'localhost';
GRANT SELECT ON performance_schema.* TO 'local_lib_user'@'localhost';
