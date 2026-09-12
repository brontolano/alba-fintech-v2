import mysql from 'mysql2/promise';

// Semua tabel yang perlu ada
const tables = [
    'lembagas', 'units', 'users', 'financial_categories', 'bank_accounts',
    'transactions', 'approvals', 'financial_notes', 'inventory_items',
    'order_items', 'notifications', 'broadcast_messages', 'broadcast_recipients',
    'audit_logs', 'push_subscriptions'
];

const createTables = [
    `-- Lembaga (Pondok Pesantren)
CREATE TABLE lembagas (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  code VARCHAR(255) UNIQUE,
  description TEXT,
  address TEXT,
  isActive BOOLEAN DEFAULT TRUE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) DEFAULT CHARSET=utf8mb4;`,

    `-- Units (KPAK, Koperasi, Kantin)
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
) DEFAULT CHARSET=utf8mb4;`,

    `-- Users
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
) DEFAULT CHARSET=utf8mb4;`,

    `-- Financial Categories
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
) DEFAULT CHARSET=utf8mb4;`,

    `-- Bank Accounts
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
) DEFAULT CHARSET=utf8mb4;`,

    `-- Transactions
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
) DEFAULT CHARSET=utf8mb4;`,

    `-- Approvals
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
) DEFAULT CHARSET=utf8mb4;`,

    `-- Financial Notes
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
) DEFAULT CHARSET=utf8mb4;`,

    `-- Inventory Items
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
) DEFAULT CHARSET=utf8mb4;`,

    `-- Order Items (POS)
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
) DEFAULT CHARSET=utf8mb4;`,

    `-- Notifications
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
) DEFAULT CHARSET=utf8mb4;`,

    `-- Broadcast Messages
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
) DEFAULT CHARSET=utf8mb4;`,

    `-- Broadcast Recipients
CREATE TABLE broadcast_recipients (
  id VARCHAR(36) PRIMARY KEY,
  broadcastId VARCHAR(36) NOT NULL,
  userId VARCHAR(36) NOT NULL,
  isRead BOOLEAN DEFAULT FALSE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (broadcastId) REFERENCES broadcast_messages(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) DEFAULT CHARSET=utf8mb4;`,

    `-- Audit Logs
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
) DEFAULT CHARSET=utf8mb4;`,

    `-- Push Subscriptions
CREATE TABLE push_subscriptions (
  id VARCHAR(36) PRIMARY KEY,
  userId VARCHAR(36) NOT NULL,
  endpoint VARCHAR(512) NOT NULL UNIQUE,
  \`keys\` LONGTEXT NOT NULL,
  expiresAt DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) DEFAULT CHARSET=utf8mb4;`
];

const tableNames = [
    'lembagas', 'units', 'users', 'financial_categories', 'bank_accounts',
    'transactions', 'approvals', 'financial_notes', 'inventory_items',
    'order_items', 'notifications', 'broadcast_messages', 'broadcast_recipients',
    'audit_logs', 'push_subscriptions'
];

async function main() {
    const connection = await mysql.createConnection({
        host: 'srv594.hstgr.io',
        user: 'u826712707_alba',
        password: 'B-5millahberkah',
        database: 'u826712707_alba'
    });
    
    console.log('Connected to database!\n');
    
    // Check existing tables
    const [existingRows] = await connection.query('SHOW TABLES');
    const existingTables = existingRows.map(r => Object.values(r)[0]);
    console.log('Existing tables:', existingTables.join(', '), '\n');
    
    // Check which tables need to be created
    const missingTables = tableNames.filter(t => !existingTables.includes(t));
    
    if (missingTables.length === 0) {
        console.log('✅ Semua tabel sudah ada!');
    } else {
        console.log('Missing tables:', missingTables.join(', '));
        
        // Create missing tables
        for (let i = 0; i < tableNames.length; i++) {
            if (missingTables.includes(tableNames[i])) {
                console.log(`Creating ${tableNames[i]}...`);
                try {
                    await connection.query(createTables[i]);
                    console.log(`  ✅ ${tableNames[i]} created`);
                } catch (e) {
                    console.log(`  ❌ Error: ${e.message}`);
                }
            }
        }
    }
    
    await connection.end();
    console.log('\n✅ Selesai!');
}

main().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});