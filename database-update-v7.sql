-- ============================================================
-- ALBA Finance — Update v7: Hitung jajanan sisa titipan
-- 1) Tabel stock_counts (hasil hitung sisa fisik per unit/UMKM/hari)
--    + payload JSON baris (tercatat, dihitung, terjual, hak)
--    + status DRAFT/APPROVED/REJECTED (selisih disetujui manager)
-- Eksekusi manual via phpMyAdmin pada DB remote
-- (u826712707_alba) ATAU MySQL CLI. ULANGI sampai sukses.
-- JANGAN pakai `prisma db push` (drift errno 150).
-- Lihat: docs/RETAIL-STOKMASUK-SPEC.md
-- ============================================================

CREATE TABLE IF NOT EXISTS `stock_counts` (
  `id` VARCHAR(36) NOT NULL,
  `unitId` VARCHAR(36) NOT NULL,
  `ownerId` VARCHAR(36) DEFAULT NULL,
  `date` DATETIME NOT NULL,
  `payload` JSON NOT NULL,
  `totalSold` INT NOT NULL DEFAULT 0,
  `totalHak` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `status` VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  `createdById` VARCHAR(36) NOT NULL,
  `reviewedById` VARCHAR(36) DEFAULT NULL,
  `reviewedAt` DATETIME DEFAULT NULL,
  `reviewNote` TEXT DEFAULT NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `stock_counts_unit_date_idx` (`unitId`, `date`),
  INDEX `stock_counts_status_idx` (`unitId`, `status`),
  CONSTRAINT `stock_counts_ibfk_1` FOREIGN KEY (`unitId`) REFERENCES `units` (`id`) ON UPDATE RESTRICT,
  CONSTRAINT `stock_counts_ibfk_2` FOREIGN KEY (`ownerId`) REFERENCES `consignment_owners` (`id`) ON UPDATE RESTRICT,
  CONSTRAINT `stock_counts_ibfk_3` FOREIGN KEY (`createdById`) REFERENCES `users` (`id`) ON UPDATE RESTRICT,
  CONSTRAINT `stock_counts_ibfk_4` FOREIGN KEY (`reviewedById`) REFERENCES `users` (`id`) ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
