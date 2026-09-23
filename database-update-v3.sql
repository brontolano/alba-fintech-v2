-- ============================================================
-- ALBA Finance — Update v3: Pengajuan Belanja Stok + Tabungan
-- 1) Tabel purchase_items (baris pengajuan belanja stok retail)
-- 2) Kolom dailySpendLimit di savings_accounts (batas belanja harian)
-- Eksekusi manual via phpMyAdmin pada DB remote
-- (u826712707_alba) ATAU MySQL CLI. ULANGI sampai sukses.
-- JANGAN pakai `prisma db push` (drift errno 150).
-- ============================================================

CREATE TABLE IF NOT EXISTS `purchase_items` (
  `id` VARCHAR(36) NOT NULL,
  `unitId` VARCHAR(36) NOT NULL,
  `transactionId` VARCHAR(36) NOT NULL,
  `itemId` VARCHAR(36) DEFAULT NULL,
  `name` VARCHAR(200) NOT NULL,
  `qty` INT NOT NULL DEFAULT 1,
  `estUnitCost` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `isNewItem` TINYINT(1) NOT NULL DEFAULT 0,
  `fulfilled` INT NOT NULL DEFAULT 0,
  `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  `note` TEXT DEFAULT NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `purchase_items_transactionId_idx` (`transactionId`),
  INDEX `purchase_items_itemId_idx` (`itemId`),
  INDEX `purchase_items_unitId_idx` (`unitId`),
  CONSTRAINT `purchase_items_ibfk_1` FOREIGN KEY (`unitId`) REFERENCES `units` (`id`) ON UPDATE RESTRICT,
  CONSTRAINT `purchase_items_ibfk_2` FOREIGN KEY (`transactionId`) REFERENCES `transactions` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `purchase_items_ibfk_3` FOREIGN KEY (`itemId`) REFERENCES `inventory_items` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

ALTER TABLE `savings_accounts`
  ADD COLUMN `dailySpendLimit` DECIMAL(15,2) DEFAULT NULL AFTER `status`;