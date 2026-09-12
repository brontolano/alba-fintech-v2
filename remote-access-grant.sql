-- Grant Privileges untuk Remote MySQL Connection
-- Run di phpMyAdmin -> SQL tab

-- 1. Grant privileges untuk semua tabel
GRANT ALL PRIVILEGES ON u826712707_alba.* TO 'u826712707_alba'@'%' IDENTIFIED BY 'B-5millahberkah';

-- 2. Alternative jika user tidak otomatis dibuat:
-- CREATE USER IF NOT EXISTS 'u826712707_alba'@'%' IDENTIFIED BY 'B-5millahberkah';
-- GRANT ALL PRIVILEGES ON u826712707_alba.* TO 'u826712707_alba'@'%';

-- 3. Flush privileges
FLUSH PRIVILEGES;

-- 4. Uji koneksi (opsional)
-- SELECT USER(), DATABASE();