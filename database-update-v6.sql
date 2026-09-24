-- ============================================================
-- ALBA Finance — Update v6: Alur persetujuan batch + WA UMKM
-- 1) stock_batches: status DRAFT/APPROVED/REJECTED + reviewer
--    (batch lama default APPROVED — riwayat aman)
-- 2) stock_batch_items: finalUnitCost (harga final review manager)
-- 3) consignment_owners: whatsappVerified (WA aktif wajib di alur titipan)
-- Eksekusi manual via phpMyAdmin pada DB remote
-- (u826712707_alba) ATAU MySQL CLI. ULANGI sampai sukses.
-- JANGAN pakai `prisma db push` (drift errno 150).
-- Lihat: docs/RETAIL-STOKMASUK-SPEC.md
-- ============================================================

ALTER TABLE `stock_batches`
  ADD COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'APPROVED' AFTER `kind`,
  ADD COLUMN `reviewedById` VARCHAR(36) DEFAULT NULL AFTER `createdById`,
  ADD COLUMN `reviewedAt` DATETIME DEFAULT NULL AFTER `reviewedById`,
  ADD COLUMN `reviewNote` TEXT DEFAULT NULL AFTER `reviewedAt`,
  ADD INDEX `stock_batches_status_idx` (`unitId`, `status`),
  ADD CONSTRAINT `stock_batches_ibfk_3` FOREIGN KEY (`reviewedById`) REFERENCES `users` (`id`) ON UPDATE RESTRICT;

ALTER TABLE `stock_batch_items`
  ADD COLUMN `finalUnitCost` DECIMAL(15,2) DEFAULT NULL AFTER `unitCost`;

ALTER TABLE `consignment_owners`
  ADD COLUMN `whatsappVerified` TINYINT(1) NOT NULL DEFAULT 0 AFTER `phone`;
