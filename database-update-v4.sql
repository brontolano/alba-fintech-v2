-- ============================================================
-- ALBA Finance — Update v4: Multi-session Shift + Sesi POS retail
-- 1) Tabel shift_sessions (segmen check-in/out berkali-kali per hari)
-- 2) Tabel pos_sessions (open/close kasir + rekonsiliasi modal awal)
-- 3) Kolom transactions.posSessionId (tautan penjualan ke sesi POS)
-- Eksekusi manual via phpMyAdmin pada DB remote
-- (u826712707_alba) ATAU MySQL CLI. ULANGI sampai sukses.
-- JANGAN pakai `prisma db push` (drift errno 150).
-- Collation disamakan ke utf8mb4_uca1400_ai_ci agar ADD FK aman.
-- Lihat: docs/RETAIL-CHECKIN-POS-SPEC.md
-- ============================================================

CREATE TABLE IF NOT EXISTS `shift_sessions` (
  `id` VARCHAR(36) NOT NULL,
  `unitId` VARCHAR(36) NOT NULL,
  `userId` VARCHAR(36) NOT NULL,
  `date` DATETIME NOT NULL,
  `checkInAt` DATETIME NOT NULL,
  `checkOutAt` DATETIME DEFAULT NULL,
  `service` VARCHAR(20) DEFAULT NULL,
  `note` TEXT DEFAULT NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `shift_sessions_unit_user_date_idx` (`unitId`, `userId`, `date`),
  INDEX `shift_sessions_open_idx` (`unitId`, `userId`, `checkOutAt`),
  CONSTRAINT `shift_sessions_ibfk_1` FOREIGN KEY (`unitId`) REFERENCES `units` (`id`) ON UPDATE RESTRICT,
  CONSTRAINT `shift_sessions_ibfk_2` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `pos_sessions` (
  `id` VARCHAR(36) NOT NULL,
  `unitId` VARCHAR(36) NOT NULL,
  `userId` VARCHAR(36) NOT NULL,
  `date` DATETIME NOT NULL,
  `openedAt` DATETIME NOT NULL,
  `openingCash` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `closedAt` DATETIME DEFAULT NULL,
  `expectedCash` DECIMAL(15,2) DEFAULT NULL,
  `countedCash` DECIMAL(15,2) DEFAULT NULL,
  `discrepancy` DECIMAL(15,2) DEFAULT NULL,
  `closeNote` TEXT DEFAULT NULL,
  `autoClosed` TINYINT(1) NOT NULL DEFAULT 0,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `pos_sessions_unit_user_date_idx` (`unitId`, `userId`, `date`),
  INDEX `pos_sessions_open_idx` (`unitId`, `userId`, `closedAt`),
  CONSTRAINT `pos_sessions_ibfk_1` FOREIGN KEY (`unitId`) REFERENCES `units` (`id`) ON UPDATE RESTRICT,
  CONSTRAINT `pos_sessions_ibfk_2` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

ALTER TABLE `transactions`
  ADD COLUMN `posSessionId` VARCHAR(36) DEFAULT NULL AFTER `accountId`;

ALTER TABLE `transactions`
  ADD INDEX `transactions_posSessionId_idx` (`posSessionId`);

ALTER TABLE `transactions`
  ADD CONSTRAINT `transactions_possession_ibfk` FOREIGN KEY (`posSessionId`) REFERENCES `pos_sessions` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
