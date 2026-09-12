-- ALBA Finance v3 - Database Schema FULL
-- Generated from prisma/schema.prisma sync
-- MySQL 8.0+ compatible
-- Run di phpMyAdmin atau mysql command line

-- ============================================
-- ENUM DEFINITIONS (inline di SQL)
-- ============================================

-- role = ('SUPERADMIN', 'PIMPINAN', 'MANAGER', 'STAFF')
-- unit_type = ('KPAK', 'KOPERASI', 'KANTIN', 'UMUM')
-- category_type = ('INCOME', 'EXPENSE', 'TRANSFER')
-- account_type = ('CASH', 'BANK', 'E_WALLET')
-- transaction_type = ('INCOME', 'EXPENSE', 'TRANSFER')
-- transaction_status = ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED')
-- approval_status = ('PENDING', 'APPROVED', 'REJECTED')
-- notification_type = ('INFO', 'SUCCESS', 'WARNING', 'ERROR')
-- broadcast_status = ('DRAFT', 'PENDING', 'SENT', 'FAILED')

-- ============================================
-- TABEL UTAMA
-- ============================================

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS push_subscriptions;
DROP TABLE IF EXISTS system_settings;
DROP TABLE IF EXISTS unit_settings;
DROP TABLE IF EXISTS broadcast_recipients;
DROP TABLE IF EXISTS broadcast_messages;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS inventory_items;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS financial_notes;
DROP TABLE IF EXISTS approvals;
DROP TABLE IF EXISTS bank_accounts;
DROP TABLE IF EXISTS financial_categories;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS units;
DROP TABLE IF EXISTS lembagas;

-- Lembaga (Pondok Pesantren)
CREATE TABLE lembagas (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  code VARCHAR(255) UNIQUE,
  description TEXT,
  address TEXT,
  isActive BOOLEAN DEFAULT TRUE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) DEFAULT CHARSET=utf8mb4;

-- Units (KPAK, Koperasi, Kantin)
CREATE TABLE units (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  isActive BOOLEAN DEFAULT TRUE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  lembagaId VARCHAR(36),
  isRetail BOOLEAN DEFAULT FALSE,
  type ENUM('KPAK', 'KOPERASI', 'KANTIN', 'UMUM') DEFAULT 'KPAK',
  parentId VARCHAR(36),
  FOREIGN KEY (lembagaId) REFERENCES lembagas(id) ON DELETE SET NULL
) DEFAULT CHARSET=utf8mb4;

-- Users
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  passwordHash VARCHAR(255) NOT NULL,
  role ENUM('SUPERADMIN', 'PIMPINAN', 'MANAGER', 'STAFF') DEFAULT 'STAFF',
  unitId VARCHAR(36),
  lembagaId VARCHAR(36),
  isActive BOOLEAN DEFAULT TRUE,
  emailVerified DATETIME,
  image VARCHAR(255),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (unitId) REFERENCES units(id) ON DELETE SET NULL,
  FOREIGN KEY (lembagaId) REFERENCES lembagas(id) ON DELETE SET NULL
) DEFAULT CHARSET=utf8mb4;

-- ============================================
-- FINANCIAL TABLES
-- ============================================

-- Financial Categories
CREATE TABLE financial_categories (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(255) NOT NULL UNIQUE,
  type ENUM('INCOME', 'EXPENSE', 'TRANSFER') NOT NULL,
  description TEXT,
  parentId VARCHAR(36),
  isActive BOOLEAN DEFAULT TRUE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  lembagaId VARCHAR(36),
  FOREIGN KEY (parentId) REFERENCES financial_categories(id) ON DELETE SET NULL,
  FOREIGN KEY (lembagaId) REFERENCES lembagas(id) ON DELETE SET NULL
) DEFAULT CHARSET=utf8mb4;

-- Bank Accounts
CREATE TABLE bank_accounts (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(255) NOT NULL UNIQUE,
  type ENUM('CASH', 'BANK', 'E_WALLET') NOT NULL,
  balance DECIMAL(15,2) DEFAULT 0.00,
  description TEXT,
  isActive BOOLEAN DEFAULT TRUE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  unitId VARCHAR(36),
  FOREIGN KEY (unitId) REFERENCES units(id) ON DELETE SET NULL
) DEFAULT CHARSET=utf8mb4;

-- TRANSACTIONS
CREATE TABLE transactions (
  id VARCHAR(36) PRIMARY KEY,
  unitId VARCHAR(36) NOT NULL,
  type ENUM('INCOME', 'EXPENSE', 'TRANSFER') NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  description TEXT NOT NULL,
  categoryId VARCHAR(36),
  accountId VARCHAR(36),
  reference VARCHAR(255),
  date DATETIME DEFAULT CURRENT_TIMESTAMP,
  status ENUM('DRAFT', 'PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
  createdById VARCHAR(36) NOT NULL,
  approvedById VARCHAR(36),
  approvedAt DATETIME,
  photoUrl VARCHAR(500),
  paymentMethod VARCHAR(50),
  isPimpinanNote BOOLEAN DEFAULT FALSE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (unitId) REFERENCES units(id),
  FOREIGN KEY (categoryId) REFERENCES financial_categories(id),
  FOREIGN KEY (accountId) REFERENCES bank_accounts(id),
  FOREIGN KEY (createdById) REFERENCES users(id),
  FOREIGN KEY (approvedById) REFERENCES users(id)
) DEFAULT CHARSET=utf8mb4;

-- Indexes untuk transactions
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_unit_id ON transactions(unitId);
CREATE INDEX idx_transactions_created_by_id ON transactions(createdById);
CREATE INDEX idx_transactions_category_id ON transactions(categoryId);
CREATE INDEX idx_transactions_account_id ON transactions(accountId);
CREATE INDEX idx_transactions_approved_by_id ON transactions(approvedById);
CREATE INDEX idx_transactions_status_created_at ON transactions(status, createdAt);
CREATE INDEX idx_transactions_unit_created_at ON transactions(unitId, createdAt);

-- ============================================
-- APPROVAL & FINANCIAL NOTES
-- ============================================

-- Approvals
CREATE TABLE approvals (
  id VARCHAR(36) PRIMARY KEY,
  transactionId VARCHAR(36) NOT NULL,
  unitId VARCHAR(36),
  approverId VARCHAR(36) NOT NULL,
  status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
  comment TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (transactionId) REFERENCES transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (unitId) REFERENCES units(id) ON DELETE SET NULL,
  FOREIGN KEY (approverId) REFERENCES users(id)
) DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_approvals_transaction_id ON approvals(transactionId);
CREATE INDEX idx_approvals_approver_id ON approvals(approverId);
CREATE INDEX idx_approvals_unit_id ON approvals(unitId);

-- Financial Notes
CREATE TABLE financial_notes (
  id VARCHAR(36) PRIMARY KEY,
  unitId VARCHAR(36),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  type ENUM('INCOME', 'EXPENSE', 'TRANSFER') NOT NULL,
  date DATETIME DEFAULT CURRENT_TIMESTAMP,
  categoryId VARCHAR(36),
  createdById VARCHAR(36) NOT NULL,
  approvedById VARCHAR(36),
  approvedAt DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  isReconciled BOOLEAN DEFAULT FALSE,
  reconciledAt DATETIME,
  reconciledById VARCHAR(36),
  FOREIGN KEY (unitId) REFERENCES units(id) ON DELETE SET NULL,
  FOREIGN KEY (categoryId) REFERENCES financial_categories(id),
  FOREIGN KEY (createdById) REFERENCES users(id),
  FOREIGN KEY (approvedById) REFERENCES users(id),
  FOREIGN KEY (reconciledById) REFERENCES users(id)
) DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_financial_notes_unit_id ON financial_notes(unitId);
CREATE INDEX idx_financial_notes_created_by_id ON financial_notes(createdById);
CREATE INDEX idx_financial_notes_date ON financial_notes(date);
CREATE INDEX idx_financial_notes_is_reconciled ON financial_notes(isReconciled);
CREATE INDEX idx_financial_notes_unit_date ON financial_notes(unitId, date);
CREATE INDEX idx_financial_notes_approved_by_id ON financial_notes(approvedById);
CREATE INDEX idx_financial_notes_reconciled_by_id ON financial_notes(reconciledById);

-- ============================================
-- INVENTORY & POS
-- ============================================

-- Inventory Items
CREATE TABLE inventory_items (
  id VARCHAR(36) PRIMARY KEY,
  unitId VARCHAR(36) NOT NULL,
  name VARCHAR(200) NOT NULL,
  sku VARCHAR(50) NOT NULL UNIQUE,
  category VARCHAR(100),
  imageUrl VARCHAR(500),
  currentStock INT DEFAULT 0,
  minStock INT DEFAULT 0,
  unitPrice DECIMAL(12,2),
  purchasePrice DECIMAL(12,2),
  isActive BOOLEAN DEFAULT TRUE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (unitId) REFERENCES units(id) ON DELETE CASCADE
) DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_inventory_items_unit_id ON inventory_items(unitId);
CREATE INDEX idx_inventory_items_category ON inventory_items(category);

-- Order Items (POS)
CREATE TABLE order_items (
  id VARCHAR(36) PRIMARY KEY,
  transactionId VARCHAR(36) NOT NULL,
  itemId VARCHAR(36),
  itemName VARCHAR(255) NOT NULL,
  quantity INT DEFAULT 1,
  unitPrice DECIMAL(12,2) NOT NULL,
  totalPrice DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (transactionId) REFERENCES transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (itemId) REFERENCES inventory_items(id) ON DELETE SET NULL
) DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_order_items_transaction_id ON order_items(transactionId);
CREATE INDEX idx_order_items_item_id ON order_items(itemId);

-- ============================================
-- NOTIFICATIONS & BROADCAST
-- ============================================

-- Notifications
CREATE TABLE notifications (
  id VARCHAR(36) PRIMARY KEY,
  userId VARCHAR(36),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('INFO', 'SUCCESS', 'WARNING', 'ERROR') NOT NULL,
  isRead BOOLEAN DEFAULT FALSE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
) DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_notifications_user_id ON notifications(userId);
CREATE INDEX idx_notifications_is_read ON notifications(isRead);
CREATE INDEX idx_notifications_created_at ON notifications(createdAt);

-- Broadcast Messages
CREATE TABLE broadcast_messages (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'INFO',
  priority VARCHAR(20) DEFAULT 'NORMAL',
  status ENUM('DRAFT', 'PENDING', 'SENT', 'FAILED') DEFAULT 'DRAFT',
  isDraft BOOLEAN DEFAULT TRUE,
  isSent BOOLEAN DEFAULT FALSE,
  sentAt DATETIME,
  deliveredTo INT,
  lembagaId VARCHAR(36),
  senderId VARCHAR(36) NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (lembagaId) REFERENCES lembagas(id) ON DELETE SET NULL,
  FOREIGN KEY (senderId) REFERENCES users(id)
) DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_broadcast_messages_sender_id ON broadcast_messages(senderId);
CREATE INDEX idx_broadcast_messages_lembaga_id ON broadcast_messages(lembagaId);

-- Broadcast Recipients
CREATE TABLE broadcast_recipients (
  id VARCHAR(36) PRIMARY KEY,
  broadcastId VARCHAR(36) NOT NULL,
  userId VARCHAR(36) NOT NULL,
  isRead BOOLEAN DEFAULT FALSE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (broadcastId) REFERENCES broadcast_messages(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_broadcast_recipients_broadcast_id ON broadcast_recipients(broadcastId);
CREATE INDEX idx_broadcast_recipients_user_id ON broadcast_recipients(userId);
CREATE UNIQUE INDEX idx_broadcast_recipients_unique ON broadcast_recipients(broadcastId, userId);

-- ============================================
-- SETTINGS & SYSTEM
-- ============================================

-- Unit Settings
CREATE TABLE unit_settings (
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

-- System Settings
CREATE TABLE system_settings (
  id VARCHAR(36) PRIMARY KEY,
  `key` VARCHAR(255) NOT NULL UNIQUE,
  `value` TEXT,
  description TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) DEFAULT CHARSET=utf8mb4;

-- ============================================
-- AUDIT LOGS
-- ============================================

-- Audit Logs
CREATE TABLE audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  userId VARCHAR(36),
  action VARCHAR(255) NOT NULL,
  entity VARCHAR(100) NOT NULL,
  entityId VARCHAR(36),
  oldData TEXT,
  newData TEXT,
  ipAddress VARCHAR(45),
  userAgent VARCHAR(500),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
) DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_audit_logs_user_id ON audit_logs(userId);
CREATE INDEX idx_audit_logs_entity_entity_id ON audit_logs(entity, entityId);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(createdAt);

-- ============================================
-- PUSH SUBSCRIPTIONS
-- ============================================

-- Push Subscriptions
CREATE TABLE push_subscriptions (
  id VARCHAR(36) PRIMARY KEY,
  userId VARCHAR(36) NOT NULL,
  endpoint VARCHAR(512) NOT NULL UNIQUE,
  keys LONGTEXT NOT NULL,
  expiresAt DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(userId);

-- ============================================
-- DEFAULT DATA
-- ============================================

-- Insert default financial categories
INSERT INTO financial_categories (id, name, code, type, description, isActive, lembagaId) VALUES
('cat-income-1', 'Pendapatan', 'INCOME-001', 'INCOME', 'Pendapatan pokok dan tambahan', TRUE, NULL),
('cat-expense-1', 'Pengeluaran', 'EXPENSE-001', 'EXPENSE', 'Pengeluaran operasional', TRUE, NULL),
('cat-income-2', 'Buku', 'INCOME-002', 'INCOME', 'Penjualan buku', TRUE, NULL);

-- Insert default system settings
INSERT INTO system_settings (id, `key`, `value`, description) VALUES
('sys-1', 'theme.primary', '#3b82f6', 'Primary warna aplikasi'),
('sys-2', 'theme.ring', '#7c3aed', 'Warna ring button'),
('sys-3', 'app.name', 'ALBA Finance', 'Nama aplikasi'),
('sys-4', 'app.version', '3.0.0', 'Versi aplikasi');

-- ============================================
-- END OF SCHEMA
-- ============================================