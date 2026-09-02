-- ALBA Finance v3 - MySQL initialization script
-- Used by docker-compose.yml for initial database setup

CREATE DATABASE IF NOT EXISTS alba_finance_v3 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE alba_finance_v3;

-- Database user for the application
CREATE USER IF NOT EXISTS 'alba_user'@'%' IDENTIFIED BY 'bismillah123!';
GRANT ALL PRIVILEGES ON alba_finance_v3.* TO 'alba_user'@'%';
FLUSH PRIVILEGES;
