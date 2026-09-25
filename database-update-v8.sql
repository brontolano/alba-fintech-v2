-- ============================================================
-- ALBA Finance — Update v8: Modul Belanja Stok unit retail
-- 1) Tabel purchase_requests (pengajuan belanja → request stok)
--    Status: REQUESTED → ORDERED → RECEIVED → PAID / REJECTED
-- 2) Tabel purchase_request_items (baris item beserta qty/satuan)
-- Eksekusi manual via phpMyAdmin pada DB remote
-- (u826712707_alba) ATAU MySQL CLI. ULANGI sampai sukses.
-- JANGAN pakai `prisma db push` (drift errno 150).
-- Lihat: docs/RETAIL-BELANJA-SPEC.md
-- ============================================================

CREATE TABLE IF NOT EXISTS `purchase_requests` (
  `id` VARCHAR(36) NOT NULL,
  `unitId` VARCHAR(36) NOT NULL,
  `requestNo` VARCHAR(30) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `note` TEXT DEFAULT NULL,
  `status` VARCHAR(20) DEFAULT 'REQUESTED',
  `estimatedTotal` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `finalTotal` DECIMAL(15,2) DEFAULT NULL,
  `refusedReason` TEXT DEFAULT NULL,
  `supplierName` VARCHAR(255) DEFAULT NULL,
  `supplierPhone` VARCHAR(30) DEFAULT NULL,
  `orderAt` DATETIME DEFAULT NULL,
  `orderById` VARCHAR(36) DEFAULT NULL,
  `receivedAt` DATETIME DEFAULT NULL,
  `receivedById` VARCHAR(36) DEFAULT NULL,
  `receiveNote` TEXT DEFAULT NULL,
  `invoiceNumber` VARCHAR(100) DEFAULT NULL,
  `paidAt` DATETIME DEFAULT NULL,
  `paidById` VARCHAR(36) DEFAULT NULL,
  `transactionId` VARCHAR(36) DEFAULT NULL,
  `createdById` VARCHAR(36) NOT NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `purchase_requests_requestNo_key` (`requestNo`),
  UNIQUE KEY `purchase_requests_transactionId_key` (`transactionId`),
  INDEX `purchase_requests_unit_date_idx` (`unitId`, `createdAt`),
  INDEX `purchase_requests_status_idx` (`status`),
  INDEX `purchase_requests_createdById_idx` (`createdById`),
  CONSTRAINT `purchase_requests_ibfk_1` FOREIGN KEY (`unitId`) REFERENCES `units` (`id`) ON UPDATE RESTRICT,
  CONSTRAINT `purchase_requests_ibfk_2` FOREIGN KEY (`createdById`) REFERENCES `users` (`id`) ON UPDATE RESTRICT,
  CONSTRAINT `purchase_requests_ibfk_3` FOREIGN KEY (`orderById`) REFERENCES `users` (`id`) ON UPDATE RESTRICT,
  CONSTRAINT `purchase_requests_ibfk_4` FOREIGN KEY (`receivedById`) REFERENCES `users` (`id`) ON UPDATE RESTRICT,
  CONSTRAINT `purchase_requests_ibfk_5` FOREIGN KEY (`paidById`) REFERENCES `users` (`id`) ON UPDATE RESTRICT,
  CONSTRAINT `purchase_requests_ibfk_6` FOREIGN KEY (`transactionId`) REFERENCES `transactions` (`id`) ON UPDATE RESTRICT ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `purchase_request_items` (
  `id` VARCHAR(36) NOT NULL,
  `requestId` VARCHAR(36) NOT NULL,
  `itemId` VARCHAR(36) DEFAULT NULL,
  `name` VARCHAR(200) NOT NULL,
  `qtyRequested` INT NOT NULL DEFAULT 1,
  `estUnitCost` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `isNewItem` TINYINT(1) DEFAULT 0,
  `qtyReceived` INT DEFAULT NULL,
  `unitCost` DECIMAL(15,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `purchase_request_items_requestId_idx` (`requestId`),
  INDEX `purchase_request_items_itemId_idx` (`itemId`),
  CONSTRAINT `purchase_request_items_ibfk_1` FOREIGN KEY (`requestId`) REFERENCES `purchase_requests` (`id`) ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT `purchase_request_items_ibfk_2` FOREIGN KEY (`itemId`) REFERENCES `inventory_items` (`id`) ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;