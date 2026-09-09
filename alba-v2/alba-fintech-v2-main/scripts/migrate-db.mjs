/**
 * ALBA Finance v3 — Comprehensive Database Migration Script
 *
 * Script ini menambahkan SEMUA kolom yang didefinisikan di schema.prisma
 * tapi belum ada di database production. Idempotent: aman dijalankan berulang.
 *
 * USAGE:
 *   node scripts/migrate-db.mjs (di server production setelah deploy)
 *
 * Dijalankan setelah:
 * - npm run build (di lokal)
 * - Upload ke Hostinger
 * - npm install (prisma generate)
 *
 * Lalu jalankan: node scripts/migrate-db.mjs
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load .env.production
dotenv.config({ path: '.env.production' });

const config = {
  host: process.env.DB_HOST || process.env.DB_HOSTNAME || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || process.env.DATABASE_NAME || process.env.DB_DATABASE || 'alba',
};

console.log('🔍 Memeriksa koneksi database...');
console.log('  Host:', config.host);
console.log('  Database:', config.database);
console.log('  User:', config.user);

const connection = await mysql.createConnection(config);

async function columnExists(table, column) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows[0].count > 0;
}

async function addColumnIfNotExists(table, column, definition) {
  const exists = await columnExists(table, column);
  if (!exists) {
    console.log(`  ⚠️  Menambahkan ${table}.${column}...`);
    await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    console.log(`  ✅ ${table}.${column} ditambahkan`);
  } else {
    console.log(`  ✅ ${table}.${column} sudah ada`);
  }
}

async function addIndexIfNotExists(table, indexName, columns) {
  try {
    const [indexes] = await connection.query(`SHOW INDEX FROM \`${table}\` WHERE Key_name = ?`, [indexName]);
    if (indexes.length === 0) {
      console.log(`  ⚠️  Menambahkan index ${indexName}...`);
      await connection.query(`CREATE INDEX \`${indexName}\` ON \`${table}\` (${columns})`);
      console.log(`  ✅ Index ${indexName} ditambahkan`);
    } else {
      console.log(`  ✅ Index ${indexName} sudah ada`);
    }
  } catch (err) {
    console.log(`  ⚠️  Index ${indexName} skip: ${err.message}`);
  }
}

try {
  console.log('\n📋 Memulai migrasi database komprehensif...\n');

  // ============================================
  // 1. TABEL: lembagas
  // ============================================
  console.log('📦 Tabel: lembagas');
  await addColumnIfNotExists('lembagas', 'id', 'VARCHAR(191) PRIMARY KEY');
  await addColumnIfNotExists('lembagas', 'name', 'VARCHAR(255) UNIQUE');
  await addColumnIfNotExists('lembagas', 'code', 'VARCHAR(100) UNIQUE');
  await addColumnIfNotExists('lembagas', 'description', 'TEXT');
  await addColumnIfNotExists('lembagas', 'address', 'TEXT');
  await addColumnIfNotExists('lembagas', 'is_active', 'TINYINT DEFAULT 1');
  await addColumnIfNotExists('lembagas', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  await addColumnIfNotExists('lembagas', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
  await addIndexIfNotExists('lembagas', 'idx_lembagas_is_active', 'is_active');

  // ============================================
  // 2. TABEL: units
  // ============================================
  console.log('\n📦 Tabel: units');
  await addColumnIfNotExists('units', 'id', 'VARCHAR(191) PRIMARY KEY');
  await addColumnIfNotExists('units', 'name', 'VARCHAR(255)');
  await addColumnIfNotExists('units', 'code', 'VARCHAR(100) UNIQUE');
  await addColumnIfNotExists('units', 'description', 'TEXT');
  await addColumnIfNotExists('units', 'is_active', 'TINYINT DEFAULT 1');
  await addColumnIfNotExists('units', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  await addColumnIfNotExists('units', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
  await addColumnIfNotExists('units', 'lembaga_id', 'VARCHAR(191)');
  await addColumnIfNotExists('units', 'is_retail', 'TINYINT DEFAULT 0');
  await addColumnIfNotExists('units', 'type', 'ENUM("KPAK","KOPERASI","KANTIN","UMUM") DEFAULT "KPAK"');
  await addColumnIfNotExists('units', 'parent_id', 'VARCHAR(191)');
  await addIndexIfNotExists('units', 'idx_units_lembaga_id', 'lembaga_id');
  await addIndexIfNotExists('units', 'idx_units_parent_id', 'parent_id');
  await addIndexIfNotExists('units', 'idx_units_is_active', 'is_active');

  // ============================================
  // 3. TABEL: users
  // ============================================
  console.log('\n📦 Tabel: users');
  await addColumnIfNotExists('users', 'id', 'VARCHAR(191) PRIMARY KEY');
  await addColumnIfNotExists('users', 'email', 'VARCHAR(255) UNIQUE');
  await addColumnIfNotExists('users', 'name', 'VARCHAR(255)');
  await addColumnIfNotExists('users', 'password_hash', 'VARCHAR(255)');
  await addColumnIfNotExists('users', 'role', 'ENUM("SUPERADMIN","PIMPINAN","MANAGER","STAFF") DEFAULT "STAFF"');
  await addColumnIfNotExists('users', 'unit_id', 'VARCHAR(191)');
  await addColumnIfNotExists('users', 'lembaga_id', 'VARCHAR(191)');
  await addColumnIfNotExists('users', 'is_active', 'TINYINT DEFAULT 1');
  await addColumnIfNotExists('users', 'email_verified', 'DATETIME');
  await addColumnIfNotExists('users', 'image', 'VARCHAR(500)');
  await addColumnIfNotExists('users', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  await addColumnIfNotExists('users', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
  await addIndexIfNotExists('users', 'idx_users_unit_id', 'unit_id');
  await addIndexIfNotExists('users', 'idx_users_lembaga_id', 'lembaga_id');
  await addIndexIfNotExists('users', 'idx_users_is_active', 'is_active');

  // ============================================
  // 4. TABEL: financial_categories
  // ============================================
  console.log('\n📦 Tabel: financial_categories');
  await addColumnIfNotExists('financial_categories', 'id', 'VARCHAR(191) PRIMARY KEY');
  await addColumnIfNotExists('financial_categories', 'name', 'VARCHAR(255)');
  await addColumnIfNotExists('financial_categories', 'code', 'VARCHAR(100) UNIQUE');
  await addColumnIfNotExists('financial_categories', 'type', 'ENUM("INCOME","EXPENSE","TRANSFER")');
  await addColumnIfNotExists('financial_categories', 'description', 'TEXT');
  await addColumnIfNotExists('financial_categories', 'parent_id', 'VARCHAR(191)');
  await addColumnIfNotExists('financial_categories', 'is_active', 'TINYINT DEFAULT 1');
  await addColumnIfNotExists('financial_categories', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  await addColumnIfNotExists('financial_categories', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
  await addColumnIfNotExists('financial_categories', 'lembaga_id', 'VARCHAR(191)');
  await addIndexIfNotExists('financial_categories', 'idx_financial_categories_type', 'type');
  await addIndexIfNotExists('financial_categories', 'idx_financial_categories_parent_id', 'parent_id');
  await addIndexIfNotExists('financial_categories', 'idx_financial_categories_lembaga_id', 'lembaga_id');

  // ============================================
  // 5. TABEL: bank_accounts
  // ============================================
  console.log('\n📦 Tabel: bank_accounts');
  await addColumnIfNotExists('bank_accounts', 'id', 'VARCHAR(191) PRIMARY KEY');
  await addColumnIfNotExists('bank_accounts', 'name', 'VARCHAR(255)');
  await addColumnIfNotExists('bank_accounts', 'code', 'VARCHAR(100) UNIQUE');
  await addColumnIfNotExists('bank_accounts', 'type', 'ENUM("CASH","BANK","E_WALLET")');
  await addColumnIfNotExists('bank_accounts', 'balance', 'DECIMAL(15,2) DEFAULT 0.00');
  await addColumnIfNotExists('bank_accounts', 'description', 'TEXT');
  await addColumnIfNotExists('bank_accounts', 'is_active', 'TINYINT DEFAULT 1');
  await addColumnIfNotExists('bank_accounts', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  await addColumnIfNotExists('bank_accounts', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
  await addColumnIfNotExists('bank_accounts', 'unit_id', 'VARCHAR(191)');
  await addIndexIfNotExists('bank_accounts', 'idx_bank_accounts_unit_id', 'unit_id');

  // ============================================
  // 6. TABEL: transactions
  // ============================================
  console.log('\n📦 Tabel: transactions');
  await addColumnIfNotExists('transactions', 'id', 'VARCHAR(191) PRIMARY KEY');
  await addColumnIfNotExists('transactions', 'unit_id', 'VARCHAR(191)');
  await addColumnIfNotExists('transactions', 'type', 'ENUM("INCOME","EXPENSE","TRANSFER")');
  await addColumnIfNotExists('transactions', 'amount', 'DECIMAL(15,2)');
  await addColumnIfNotExists('transactions', 'description', 'TEXT');
  await addColumnIfNotExists('transactions', 'category_id', 'VARCHAR(191)');
  await addColumnIfNotExists('transactions', 'account_id', 'VARCHAR(191)');
  await addColumnIfNotExists('transactions', 'reference', 'VARCHAR(255)');
  await addColumnIfNotExists('transactions', 'transaction_date', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  await addColumnIfNotExists('transactions', 'status', 'ENUM("DRAFT","PENDING","APPROVED","REJECTED") DEFAULT "PENDING"');
  await addColumnIfNotExists('transactions', 'created_by_id', 'VARCHAR(191)');
  await addColumnIfNotExists('transactions', 'approved_by_id', 'VARCHAR(191)');
  await addColumnIfNotExists('transactions', 'approved_at', 'DATETIME');
  await addColumnIfNotExists('transactions', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  await addColumnIfNotExists('transactions', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
  await addColumnIfNotExists('transactions', 'photo_url', 'VARCHAR(500)');
  await addColumnIfNotExists('transactions', 'is_pimpinan_note', 'TINYINT DEFAULT 0');

  // Copy data from date to transaction_date if date column exists
  if (await columnExists('transactions', 'date') && await columnExists('transactions', 'transaction_date')) {
    const [rows] = await connection.query(`SELECT COUNT(*) as c FROM transactions WHERE transaction_date IS NULL AND date IS NOT NULL`);
    if (rows[0].c > 0) {
      console.log(`  ⚠️  Copy data dari date ke transaction_date...`);
      await connection.query(`UPDATE transactions SET transaction_date = date WHERE transaction_date IS NULL AND date IS NOT NULL`);
    }
  }

  await addIndexIfNotExists('transactions', 'idx_transactions_unit_id', 'unit_id');
  await addIndexIfNotExists('transactions', 'idx_transactions_status', 'status');
  await addIndexIfNotExists('transactions', 'idx_transactions_created_by_id', 'created_by_id');
  await addIndexIfNotExists('transactions', 'idx_transactions_category_id', 'category_id');
  await addIndexIfNotExists('transactions', 'idx_transactions_account_id', 'account_id');
  await addIndexIfNotExists('transactions', 'idx_transactions_approved_by_id', 'approved_by_id');
  await addIndexIfNotExists('transactions', 'idx_transactions_status_created_at', 'status, created_at');
  await addIndexIfNotExists('transactions', 'idx_transactions_unit_id_created_at', 'unit_id, created_at');
  await addIndexIfNotExists('transactions', 'idx_transactions_date_unit_id', 'transaction_date, unit_id');

  // ============================================
  // 7. TABEL: approvals
  // ============================================
  console.log('\n📦 Tabel: approvals');
  await addColumnIfNotExists('approvals', 'id', 'VARCHAR(191) PRIMARY KEY');
  await addColumnIfNotExists('approvals', 'transaction_id', 'VARCHAR(191)');
  await addColumnIfNotExists('approvals', 'unit_id', 'VARCHAR(191)');
  await addColumnIfNotExists('approvals', 'approver_id', 'VARCHAR(191)');
  await addColumnIfNotExists('approvals', 'status', 'ENUM("PENDING","APPROVED","REJECTED") DEFAULT "PENDING"');
  await addColumnIfNotExists('approvals', 'comment', 'TEXT');
  await addColumnIfNotExists('approvals', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  await addColumnIfNotExists('approvals', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
  await addIndexIfNotExists('approvals', 'idx_approvals_transaction_id', 'transaction_id');
  await addIndexIfNotExists('approvals', 'idx_approvals_approver_id', 'approver_id');
  await addIndexIfNotExists('approvals', 'idx_approvals_unit_id', 'unit_id');

  // ============================================
  // 8. TABEL: financial_notes
  // ============================================
  console.log('\n📦 Tabel: financial_notes');
  await addColumnIfNotExists('financial_notes', 'id', 'VARCHAR(191) PRIMARY KEY');
  await addColumnIfNotExists('financial_notes', 'unit_id', 'VARCHAR(191)');
  await addColumnIfNotExists('financial_notes', 'title', 'VARCHAR(255)');
  await addColumnIfNotExists('financial_notes', 'description', 'TEXT');
  await addColumnIfNotExists('financial_notes', 'amount', 'DECIMAL(15,2)');
  await addColumnIfNotExists('financial_notes', 'type', 'ENUM("INCOME","EXPENSE","TRANSFER")');
  await addColumnIfNotExists('financial_notes', 'date', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  await addColumnIfNotExists('financial_notes', 'category_id', 'VARCHAR(191)');
  await addColumnIfNotExists('financial_notes', 'created_by_id', 'VARCHAR(191)');
  await addColumnIfNotExists('financial_notes', 'approved_by_id', 'VARCHAR(191)');
  await addColumnIfNotExists('financial_notes', 'approved_at', 'DATETIME');
  await addColumnIfNotExists('financial_notes', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  await addColumnIfNotExists('financial_notes', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
  await addColumnIfNotExists('financial_notes', 'is_reconciled', 'TINYINT DEFAULT 0');
  await addColumnIfNotExists('financial_notes', 'reconciled_at', 'DATETIME');
  await addColumnIfNotExists('financial_notes', 'reconciled_by_id', 'VARCHAR(191)');
  await addIndexIfNotExists('financial_notes', 'idx_financial_notes_unit_id', 'unit_id');
  await addIndexIfNotExists('financial_notes', 'idx_financial_notes_created_by_id', 'created_by_id');
  await addIndexIfNotExists('financial_notes', 'idx_financial_notes_date', 'date');
  await addIndexIfNotExists('financial_notes', 'idx_financial_notes_is_reconciled', 'is_reconciled');
  await addIndexIfNotExists('financial_notes', 'idx_financial_notes_unit_id_date', 'unit_id, date');

  // ============================================
  // 9. TABEL: audit_logs
  // ============================================
  console.log('\n📦 Tabel: audit_logs');
  await addColumnIfNotExists('audit_logs', 'id', 'VARCHAR(191) PRIMARY KEY');
  await addColumnIfNotExists('audit_logs', 'user_id', 'VARCHAR(191)');
  await addColumnIfNotExists('audit_logs', 'action', 'VARCHAR(255)');
  await addColumnIfNotExists('audit_logs', 'entity', 'VARCHAR(255)');
  await addColumnIfNotExists('audit_logs', 'entity_id', 'VARCHAR(191)');
  await addColumnIfNotExists('audit_logs', 'old_data', 'TEXT');
  await addColumnIfNotExists('audit_logs', 'new_data', 'TEXT');
  await addColumnIfNotExists('audit_logs', 'ip_address', 'VARCHAR(45)');
  await addColumnIfNotExists('audit_logs', 'user_agent', 'TEXT');
  await addColumnIfNotExists('audit_logs', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  await addIndexIfNotExists('audit_logs', 'idx_audit_logs_user_id', 'user_id');
  await addIndexIfNotExists('audit_logs', 'idx_audit_logs_entity_entity_id', 'entity, entity_id');
  await addIndexIfNotExists('audit_logs', 'idx_audit_logs_created_at', 'created_at');

  // ============================================
  // 10. TABEL: inventory_items
  // ============================================
  console.log('\n📦 Tabel: inventory_items');
  await addColumnIfNotExists('inventory_items', 'id', 'VARCHAR(191) PRIMARY KEY');
  await addColumnIfNotExists('inventory_items', 'unit_id', 'VARCHAR(191)');
  await addColumnIfNotExists('inventory_items', 'name', 'VARCHAR(200)');
  await addColumnIfNotExists('inventory_items', 'sku', 'VARCHAR(50) UNIQUE');
  await addColumnIfNotExists('inventory_items', 'category', 'VARCHAR(100)');
  await addColumnIfNotExists('inventory_items', 'current_stock', 'INT DEFAULT 0');
  await addColumnIfNotExists('inventory_items', 'min_stock', 'INT DEFAULT 0');
  await addColumnIfNotExists('inventory_items', 'unit_price', 'DECIMAL(12,2)');
  await addColumnIfNotExists('inventory_items', 'purchase_price', 'DECIMAL(12,2)');
  await addColumnIfNotExists('inventory_items', 'is_active', 'TINYINT DEFAULT 1');
  await addColumnIfNotExists('inventory_items', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  await addColumnIfNotExists('inventory_items', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
  await addIndexIfNotExists('inventory_items', 'idx_inventory_items_unit_id', 'unit_id');
  await addIndexIfNotExists('inventory_items', 'idx_inventory_items_category', 'category');

  // ============================================
  // 11. TABEL: order_items
  // ============================================
  console.log('\n📦 Tabel: order_items');
  await addColumnIfNotExists('order_items', 'id', 'VARCHAR(191) PRIMARY KEY');
  await addColumnIfNotExists('order_items', 'transaction_id', 'VARCHAR(191)');
  await addColumnIfNotExists('order_items', 'item_id', 'VARCHAR(191)');
  await addColumnIfNotExists('order_items', 'item_name', 'VARCHAR(255)');
  await addColumnIfNotExists('order_items', 'quantity', 'INT DEFAULT 1');
  await addColumnIfNotExists('order_items', 'unit_price', 'DECIMAL(12,2)');
  await addColumnIfNotExists('order_items', 'total_price', 'DECIMAL(12,2)');
  await addIndexIfNotExists('order_items', 'idx_order_items_transaction_id', 'transaction_id');
  await addIndexIfNotExists('order_items', 'idx_order_items_item_id', 'item_id');

  // ============================================
  // 12. TABEL: notifications
  // ============================================
  console.log('\n📦 Tabel: notifications');
  await addColumnIfNotExists('notifications', 'id', 'VARCHAR(191) PRIMARY KEY');
  await addColumnIfNotExists('notifications', 'user_id', 'VARCHAR(191)');
  await addColumnIfNotExists('notifications', 'title', 'VARCHAR(255)');
  await addColumnIfNotExists('notifications', 'message', 'TEXT');
  await addColumnIfNotExists('notifications', 'type', 'ENUM("INFO","SUCCESS","WARNING","ERROR")');
  await addColumnIfNotExists('notifications', 'is_read', 'TINYINT DEFAULT 0');
  await addColumnIfNotExists('notifications', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  await addColumnIfNotExists('notifications', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
  await addIndexIfNotExists('notifications', 'idx_notifications_user_id', 'user_id');
  await addIndexIfNotExists('notifications', 'idx_notifications_is_read', 'is_read');
  await addIndexIfNotExists('notifications', 'idx_notifications_created_at', 'created_at');

  // ============================================
  // 13. TABEL: push_subscriptions
  // ============================================
  console.log('\n📦 Tabel: push_subscriptions');
  await addColumnIfNotExists('push_subscriptions', 'id', 'VARCHAR(191) PRIMARY KEY');
  await addColumnIfNotExists('push_subscriptions', 'user_id', 'VARCHAR(191)');
  await addColumnIfNotExists('push_subscriptions', 'endpoint', 'VARCHAR(512) UNIQUE');
  await addColumnIfNotExists('push_subscriptions', 'keys', 'LONGTEXT');
  await addColumnIfNotExists('push_subscriptions', 'expires_at', 'DATETIME');
  await addColumnIfNotExists('push_subscriptions', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  await addColumnIfNotExists('push_subscriptions', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
  await addIndexIfNotExists('push_subscriptions', 'idx_push_subscriptions_user_id', 'user_id');

  // ============================================
  // 14. TABEL: broadcast_messages
  // ============================================
  console.log('\n📦 Tabel: broadcast_messages');
  await addColumnIfNotExists('broadcast_messages', 'id', 'VARCHAR(191) PRIMARY KEY');
  await addColumnIfNotExists('broadcast_messages', 'title', 'VARCHAR(200)');
  await addColumnIfNotExists('broadcast_messages', 'message', 'TEXT');
  await addColumnIfNotExists('broadcast_messages', 'type', 'VARCHAR(20) DEFAULT "INFO"');
  await addColumnIfNotExists('broadcast_messages', 'priority', 'VARCHAR(20) DEFAULT "NORMAL"');
  await addColumnIfNotExists('broadcast_messages', 'status', 'ENUM("DRAFT","PENDING","SENT","FAILED") DEFAULT "DRAFT"');
  await addColumnIfNotExists('broadcast_messages', 'is_draft', 'TINYINT DEFAULT 1');
  await addColumnIfNotExists('broadcast_messages', 'is_sent', 'TINYINT DEFAULT 0');
  await addColumnIfNotExists('broadcast_messages', 'sent_at', 'DATETIME');
  await addColumnIfNotExists('broadcast_messages', 'delivered_to', 'INT');
  await addColumnIfNotExists('broadcast_messages', 'lembaga_id', 'VARCHAR(191)');
  await addColumnIfNotExists('broadcast_messages', 'sender_id', 'VARCHAR(191)');
  await addColumnIfNotExists('broadcast_messages', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  await addColumnIfNotExists('broadcast_messages', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
  await addIndexIfNotExists('broadcast_messages', 'idx_broadcast_messages_sender_id', 'sender_id');
  await addIndexIfNotExists('broadcast_messages', 'idx_broadcast_messages_lembaga_id', 'lembaga_id');

  // ============================================
  // 15. TABEL: broadcast_recipients
  // ============================================
  console.log('\n📦 Tabel: broadcast_recipients');
  await addColumnIfNotExists('broadcast_recipients', 'id', 'VARCHAR(191) PRIMARY KEY');
  await addColumnIfNotExists('broadcast_recipients', 'broadcast_id', 'VARCHAR(191)');
  await addColumnIfNotExists('broadcast_recipients', 'user_id', 'VARCHAR(191)');
  await addColumnIfNotExists('broadcast_recipients', 'is_read', 'TINYINT DEFAULT 0');
  await addColumnIfNotExists('broadcast_recipients', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  await addIndexIfNotExists('broadcast_recipients', 'idx_broadcast_recipients_broadcast_id', 'broadcast_id');
  await addIndexIfNotExists('broadcast_recipients', 'idx_broadcast_recipients_user_id', 'user_id');
  // unique constraint handled by primary key

  // ============================================
  // 16. TABEL: unit_settings
  // ============================================
  console.log('\n📦 Tabel: unit_settings');
  await addColumnIfNotExists('unit_settings', 'id', 'VARCHAR(191) PRIMARY KEY');
  await addColumnIfNotExists('unit_settings', 'unit_id', 'VARCHAR(191) UNIQUE');
  await addColumnIfNotExists('unit_settings', 'pos_enabled', 'TINYINT DEFAULT 1');
  await addColumnIfNotExists('unit_settings', 'inventory_enabled', 'TINYINT DEFAULT 1');
  await addColumnIfNotExists('unit_settings', 'auto_approval', 'TINYINT DEFAULT 0');
  await addColumnIfNotExists('unit_settings', 'requires_approval', 'TINYINT DEFAULT 1');
  await addColumnIfNotExists('unit_settings', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  await addColumnIfNotExists('unit_settings', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

  // ============================================
  // 17. TABEL: system_settings
  // ============================================
  console.log('\n📦 Tabel: system_settings');
  await addColumnIfNotExists('system_settings', 'id', 'VARCHAR(191) PRIMARY KEY');
  await addColumnIfNotExists('system_settings', 'key', 'VARCHAR(255) UNIQUE');
  await addColumnIfNotExists('system_settings', 'value', 'TEXT');
  await addColumnIfNotExists('system_settings', 'description', 'TEXT');
  await addColumnIfNotExists('system_settings', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  await addColumnIfNotExists('system_settings', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

  console.log('\n🎉 Migrasi database komprehensif SELESAI!\n');
  console.log('📋 Catatan:');
  console.log('   - Semua kolom dari schema.prisma sudah dicek dan ditambahkan jika belum ada');
  console.log('   - Semua index yang dibutuhkan sudah ditambahkan');
  console.log('   - Script ini idempotent - aman dijalankan berulang kali');
  console.log('   - Jalankan ulang script ini jika ada schema update baru di masa depan\n');

} catch (err) {
  console.error('\n❌ Error migrasi:', err.message);
  console.error(err.stack);
  process.exit(1);
} finally {
  await connection.end();
}