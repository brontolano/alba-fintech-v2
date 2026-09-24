# Retail Manager Dashboard — Rebuild

Tujuan: beri MANAGER retail bagian **check-in/check-out shift** + **status POS**,
persis seperti STAFF, plus ringkasan manajerial per unit sendiri.

Permintaan pemilik: "kenapa manager tidak ada bagian untuk check-in/check-out —
buat ulang halaman dashboard".

## Keputusan
- `RetailManagerDashboard.tsx` dibangun ulang (konten baru; file nama tetap,
  dipakai routing `app/dashboard/page.tsx` & `app/dashboard/retail/page.tsx`).
- Sumber data utama: `/api/retail/dashboard` yang sudah mengembalikan
  `unit`, `shift.mine` (check-in/out aktif), `shift.onShift` (kru), `pos`
  (sesi POS terbuka), `lowStock`, `recent`. Semua scoped `resolveUnitId`.
- Statistik manajerial tambahan dipakai dari API yang sudah di-scope unit:
  `/api/transactions` (MANAGER dipaksa unit sendiri), `/api/retail/batches`
  (draft), `/api/approvals` (approverId = user), `/api/savings/limits`.
- Aksi shift (check-in/check-out) memakai `/api/retail/shift` dengan body
  `{ action, service }`; check-out otomatis ditolak 409 `POS_MASIH_TERBUKA`
  bila ada sesi POS, sesuai freeze.

## Aturan freeze yang dijaga
- File beku & mock test hanya mengecek eksistensi file + penanda
  routing/string tertentu yang tidak tersentuh.
- Tidak ada nama unit hardcode; UI tetap generic untuk semua `isRetail`.