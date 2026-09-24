-- ============================================================
-- ALBA Finance — Update v5: Batch Kedatangan Stok retail
-- 1) Tabel stock_batches (satu batch = satu kedatangan per unit)
-- 2) Tabel stock_batch_items (baris batch: qty x harga_beli)
-- Total modal masuk batch = SUM(qty * unitCost), dihitung server.
-- Eksekusi manual via phpMyAdmin pada DB remote
-- (u826712707_alba) ATAU MySQL CLI. ULANGI sampai sukses.
-- JANGAN pakai `prisma db push` (drift errno 150).
-- Collation disamakan ke utf8mb4_uca1400_ai_ci agar ADD FK aman.
-- Lihat: docs/RETAIL-BATCH-POS-SPEC.md
-- ============================================================

CREATE TABLE IF NOT EXISTS `stock_batches` (
  `id` VARCHAR(36) NOT NULL,
  `unitId` VARCHAR(36) NOT NULL,
  `batchNo` VARCHAR(50) NOT NULL,
  `date` DATETIME NOT NULL,
  `kind` VARCHAR(20) NOT NULL DEFAULT 'CAMPURAN',
  `totalQty` INT NOT NULL DEFAULT 0,
  `totalCost` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `sourceType` VARCHAR(20) DEFAULT NULL,
  `sourceRef` VARCHAR(36) DEFAULT NULL,
  `note` TEXT DEFAULT NULL,
  `createdById` VARCHAR(36) NOT NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `stock_batches_unit_batchNo_key` (`unitId`, `batchNo`),
  INDEX `stock_batches_unit_date_idx` (`unitId`, `date`),
  CONSTRAINT `stock_batches_ibfk_1` FOREIGN KEY (`unitId`) REFERENCES `units` (`id`) ON UPDATE RESTRICT,
  CONSTRAINT `stock_batches_ibfk_2` FOREIGN KEY (`createdById`) REFERENCES `users` (`id`) ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `stock_batch_items` (
  `id` VARCHAR(36) NOT NULL,
  `batchId` VARCHAR(36) NOT NULL,
  `inventoryItemId` VARCHAR(36) NOT NULL,
  `qty` INT NOT NULL DEFAULT 1,
  `unitCost` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `lineTotal` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `ownerId` VARCHAR(36) DEFAULT NULL,
  `marginType` VARCHAR(10) DEFAULT NULL,
  `marginValue` DECIMAL(12,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `stock_batch_items_batchId_idx` (`batchId`),
  INDEX `stock_batch_items_itemId_idx` (`inventoryItemId`),
  INDEX `stock_batch_items_ownerId_idx` (`ownerId`),
  CONSTRAINT `stock_batch_items_ibfk_1` FOREIGN KEY (`batchId`) REFERENCES `stock_batches` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `stock_batch_items_ibfk_2` FOREIGN KEY (`inventoryItemId`) REFERENCES `inventory_items` (`id`) ON UPDATE RESTRICT,
  CONSTRAINT `stock_batch_items_ibfk_3` FOREIGN KEY (`ownerId`) REFERENCES `consignment_owners` (`id`) ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
