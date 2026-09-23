-- ============================================================
-- ALBA Finance — Modul RETAIL STAFF: Konsinyasi UMKM
-- Tabel baru untuk titipan pedagang/UMKM (owner, item, payout).
-- Eksekusi manual via phpMyAdmin pada DB remote
-- (u826712707_alba) ATAU MySQL CLI. ULANGI sampai sukses.
-- JANGAN pakai `prisma db push` (drift errno 150).
-- ============================================================

CREATE TABLE IF NOT EXISTS `consignment_owners` (
  `id` VARCHAR(36) NOT NULL,
  `unitId` VARCHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `address` TEXT DEFAULT NULL,
  `isActive` TINYINT(1) DEFAULT 1,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `consignment_owners_unitId` (`unitId`),
  CONSTRAINT `consignment_owners_ibfk_1` FOREIGN KEY (`unitId`) REFERENCES `units` (`id`) ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `consignment_items` (
  `id` VARCHAR(36) NOT NULL,
  `unitId` VARCHAR(36) NOT NULL,
  `ownerId` VARCHAR(36) NOT NULL,
  `inventoryItemId` VARCHAR(36) NOT NULL,
  `marginType` ENUM('PERCENT','FIXED') NOT NULL DEFAULT 'PERCENT',
  `marginValue` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `costPrice` DECIMAL(12,2) NOT NULL,
  `agreedPrice` DECIMAL(12,2) NOT NULL,
  `isActive` TINYINT(1) DEFAULT 1,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `consignment_items_inventoryItemId_key` (`inventoryItemId`),
  INDEX `consignment_items_unitId` (`unitId`),
  INDEX `consignment_items_ownerId` (`ownerId`),
  CONSTRAINT `consignment_items_ibfk_1` FOREIGN KEY (`unitId`) REFERENCES `units` (`id`) ON UPDATE RESTRICT,
  CONSTRAINT `consignment_items_ibfk_2` FOREIGN KEY (`ownerId`) REFERENCES `consignment_owners` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `consignment_items_ibfk_3` FOREIGN KEY (`inventoryItemId`) REFERENCES `inventory_items` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `consignment_payouts` (
  `id` VARCHAR(36) NOT NULL,
  `unitId` VARCHAR(36) NOT NULL,
  `ownerId` VARCHAR(36) NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `fromDate` DATETIME NOT NULL,
  `toDate` DATETIME NOT NULL,
  `status` ENUM('PENDING','PAID','CANCELLED') NOT NULL DEFAULT 'PENDING',
  `transactionId` VARCHAR(36) DEFAULT NULL,
  `paidById` VARCHAR(36) DEFAULT NULL,
  `note` TEXT DEFAULT NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `consignment_payouts_unitId` (`unitId`),
  INDEX `consignment_payouts_ownerId` (`ownerId`),
  INDEX `consignment_payouts_status` (`status`),
  CONSTRAINT `consignment_payouts_ibfk_1` FOREIGN KEY (`unitId`) REFERENCES `units` (`id`) ON UPDATE RESTRICT,
  CONSTRAINT `consignment_payouts_ibfk_2` FOREIGN KEY (`ownerId`) REFERENCES `consignment_owners` (`id`) ON UPDATE RESTRICT,
  CONSTRAINT `consignment_payouts_ibfk_3` FOREIGN KEY (`transactionId`) REFERENCES `transactions` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `consignment_payouts_ibfk_4` FOREIGN KEY (`paidById`) REFERENCES `users` (`id`) ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;