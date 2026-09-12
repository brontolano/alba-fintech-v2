-- Add missing system_settings table for remote database
-- Run di phpMyAdmin -> SQL tab

-- Create system_settings table jika belum ada
CREATE TABLE IF NOT EXISTS system_settings (
  id VARCHAR(36) PRIMARY KEY,
  `key` VARCHAR(255) NOT NULL UNIQUE,
  `value` TEXT,
  description TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) DEFAULT CHARSET=utf8mb4;

-- Create unit_settings table jika belum ada
CREATE TABLE IF NOT EXISTS unit_settings (
  id VARCHAR(36) PRIMARY KEY,
  unitId VARCHAR(36) UNIQUE NOT NULL,
  posEnabled BOOLEAN DEFAULT TRUE,
  inventoryEnabled BOOLEAN DEFAULT TRUE,
  autoApproval BOOLEAN DEFAULT FALSE,
  requiresApproval BOOLEAN DEFAULT TRUE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (unitId) REFERENCES units(id) ON DELETE CASCADE
) DEFAULT CHARSET=utf8mb4;

-- Insert default system settings
INSERT IGNORE INTO system_settings (id, `key`, `value`, description) VALUES
('sys-1', 'theme.primary', '#3b82f6', 'Primary warna aplikasi'),
('sys-2', 'theme.ring', '#7c3aed', 'Warna ring button'),
('sys-3', 'app.name', 'ALBA Finance', 'Nama aplikasi'),
('sys-4', 'app.version', '3.0.0', 'Versi aplikasi');

-- Refresh privileges
FLUSH PRIVILEGES;