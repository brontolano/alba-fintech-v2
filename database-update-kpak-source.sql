-- Migrasi: sumber dana alokasi anggaran KPAK (kas KPAK vs kas lembaga).
-- Aturan: JALANKAN FILE INI DULU (via phpMyAdmin > SQL) SEBELUM deploy kode baru,
-- karena kode baru membaca kolom `source`. Kolom baru aman untuk kode lama
-- (kode lama tidak membaca kolom ini).
-- Jika error "Duplicate column name", berarti kolom sudah ada — abaikan.

ALTER TABLE `budget_allocations`
  ADD COLUMN `source` VARCHAR(16)
    CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci
    NOT NULL DEFAULT 'KPAK';
