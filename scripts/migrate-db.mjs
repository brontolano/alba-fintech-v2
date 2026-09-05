/**
 * ALBA Finance v3 — Database Migration Script
 *
 * Script ini dijalankan di server production untuk menambah kolom yang hilang.
 * Idempotent: aman dijalankan berulang kali.
 *
 * Kolom yang perlu ditambah (sesuai schema.prisma):
 * - units.lembaga_id (sudah ada di schema tapi belum di DB)
 * - inventory_items.purchase_price (sudah ada di schema tapi belum di DB)
 * - transactions.transaction_date (sudah ada di schema tapi belum di DB)
 *
 * USAGE:
 *   node scripts/migrate-db.mjs (di server production setelah deploy)
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load .env.production
dotenv.config({ path: '.env.production' });

const config = {
  host: process.env.DB_HOST || process.env.DB_HOSTNAME,
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || process.env.DATABASE_NAME || process.env.DB_DATABASE,
};

console.log('🔍 Memeriksa koneksi database...');
console.log('  Host:', config.host);
console.log('  Database:', config.database);

const connection = await mysql.createConnection(config);

async function columnExists(table, column) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows[0].count > 0;
}

try {
  console.log('\n📋 Memulai migrasi database...\n');

  // 1. Tambah lembaga_id di units
  const unitsHasLembaga = await columnExists('units', 'lembaga_id');
  if (!unitsHasLembaga) {
    console.log('  ⚠️  Menambahkan kolom lembaga_id ke units...');
    await connection.query('ALTER TABLE units ADD COLUMN lembaga_id VARCHAR(191)');
    await connection.query('ALTER TABLE units ADD INDEX idx_units_lembaga_id (lembaga_id)');
    console.log('  ✅ units.lembaga_id ditambahkan');
  } else {
    console.log('  ✅ units.lembaga_id sudah ada');
  }

  // 2. Tambah purchase_price di inventory_items
  const inventoryHasPurchase = await columnExists('inventory_items', 'purchase_price');
  if (!inventoryHasPurchase) {
    console.log('  ⚠️  Menambahkan kolom purchase_price ke inventory_items...');
    await connection.query('ALTER TABLE inventory_items ADD COLUMN purchase_price DECIMAL(12,2)');
    console.log('  ✅ inventory_items.purchase_price ditambahkan');
  } else {
    console.log('  ✅ inventory_items.purchase_price sudah ada');
  }

  // 3. Tambah transaction_date di transactions (mapped dari field `date`)
  const transactionsHasDate = await columnExists('transactions', 'transaction_date');
  if (!transactionsHasDate) {
    console.log('  ⚠️  Menambahkan kolom transaction_date ke transactions...');
    // Salin data dari date column jika ada, atau set default
    const transactionsHasColumn = await columnExists('transactions', 'date');
    if (transactionsHasColumn) {
      await connection.query('ALTER TABLE transactions ADD COLUMN transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP');
      await connection.query('UPDATE transactions SET transaction_date = date WHERE date IS NOT NULL');
      console.log('  ✅ transactions.transaction_date ditambahkan + data di-copy dari date');
    } else {
      await connection.query('ALTER TABLE transactions ADD COLUMN transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP');
      console.log('  ✅ transactions.transaction_date ditambahkan');
    }
  } else {
    console.log('  ✅ transactions.transaction_date sudah ada');
  }

  // 4. Tambah kolom lain yang mungkin hilang di Transaction (mapped columns)
  const txColumns = [
    'unit_id',      // transaction.unitId
    'category_id',  // transaction.categoryId
    'account_id',   // transaction.accountId
    'created_by_id',// transaction.createdById
    'approved_by_id',
    'approved_at',
    'updated_at',
  ];
  for (const col of txColumns) {
    const exists = await columnExists('transactions', col);
    if (!exists) {
      console.log(`  ⚠️  Menambahkan kolom ${col} ke transactions...`);
      if (col.endsWith('_at') || col.includes('approved')) {
        await connection.query(`ALTER TABLE transactions ADD COLUMN ${col} DATETIME`);
      } else if (col === 'unit_id' || col === 'category_id' || col === 'account_id' || col === 'created_by_id' || col === 'approved_by_id') {
        await connection.query(`ALTER TABLE transactions ADD COLUMN ${col} VARCHAR(191)`);
      }
    }
  }
  console.log('  ✅ Semua kolom Transaction lengkap');

  // 5. Tambah kolom financial_notes yang mungkin hilang
  const fnColumns = [
    'unit_id', 'category_id', 'created_by_id', 'approved_by_id',
    'approved_at', 'updated_at', 'is_reconciled', 'reconciled_at', 'reconciled_by_id',
  ];
  for (const col of fnColumns) {
    const exists = await columnExists('financial_notes', col);
    if (!exists) {
      console.log(`  ⚠️  Menambahkan kolom ${col} ke financial_notes...`);
      if (col === 'is_reconciled') {
        await connection.query(`ALTER TABLE financial_notes ADD COLUMN ${col} TINYINT DEFAULT 0`);
      } else if (col.endsWith('_at')) {
        await connection.query(`ALTER TABLE financial_notes ADD COLUMN ${col} DATETIME`);
      } else {
        await connection.query(`ALTER TABLE financial_notes ADD COLUMN ${col} VARCHAR(191)`);
      }
    }
  }
  console.log('  ✅ Semua kolom FinancialNote lengkap');

  // 6. Tambah kolom User yang mungkin hilang
  const userColumns = ['unit_id', 'lembaga_id', 'updated_at', 'is_active'];
  for (const col of userColumns) {
    const exists = await columnExists('users', col);
    if (!exists) {
      console.log(`  ⚠️  Menambahkan kolom ${col} ke users...`);
      if (col === 'is_active') {
        await connection.query(`ALTER TABLE users ADD COLUMN ${col} TINYINT DEFAULT 1`);
      } else if (col.endsWith('_id') || col === 'updated_at') {
        await connection.query(`ALTER TABLE users ADD COLUMN ${col} VARCHAR(191)`);
      }
    }
  }
  console.log('  ✅ Semua kolom User lengkap');

  console.log('\n🎉 Migrasi database selesai!\n');

} catch (err) {
  console.error('\n❌ Error migrasi:', err.message);
  process.exit(1);
} finally {
  await connection.end();
}
