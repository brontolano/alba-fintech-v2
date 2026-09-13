-- Migration: Ensure transactions.date column exists (was transaction_date)
-- Run di phpMyAdmin di Hostinger

-- Check current structure
SHOW CREATE TABLE transactions\G

-- Add date column if missing (primary column used by Prisma @map("date"))
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER reference;

-- Recreate indexes (hapus yang lama, buat baru)
DROP INDEX IF EXISTS idx_date ON transactions;
DROP INDEX IF EXISTS date ON transactions;

-- Buat index baru
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_transactions_unit_id ON transactions(unit_id);
CREATE INDEX idx_transactions_user_type_amount ON transactions(createdById, type, amount(10));

-- Verify
DESCRIBE transactions;
SELECT * FROM information_schema.columns 
WHERE table_schema = DATABASE() AND table_name = 'transactions' 
AND column_name = 'date';

-- Status: DONE
-- Next: Run 'npx prisma generate' di server, lalu restart