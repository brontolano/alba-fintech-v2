# KUNCI MODUL SUPERADMIN — JANGAN UBAH TANPA PERSETUJUAN PEMILIK

Status: **FIX / FINAL** per instruksi pemilik (baseline: poles dashboard
SUPERADMIN selesai pada fase poles UI — Executive Command Center, range
switcher, widget persetujuan, komposisi pengeluaran, quick access sistem).
Referensi design:` docs/PIMPINAN-DASHBOARD-SPEC.md` (bila belum dibuat,
perilaku dikunci apa adanya di titik ini).

## Aturan penguncian
1. File di bawah adalah permukaan final modul SUPERADMIN. Pengembangan lain
   **dilarang** mengubah perilakunya.
2. Bila perubahan tak terhindarkan, wajib:
   - Minta persetujuan eksplisit pemilik TERLEBIH DULU, dan
   - Pastikan `npm test` tetap hijau (test `superadmin-freeze.test.ts`
     gagal = perubahan DITOLAK otomatis).
3. Kebutuhan baru = file/route BARU — jangan ubah yang beku.
4. File yang sudah beku di doc lain tetap dikunci di doc-nya masing-masing:
   `docs/KPAK-STAFF-FREEZE.md`, `docs/KPAK-MANAGER-FREEZE.md`,
   `docs/RETAIL-FREEZE.md`, `docs/RETAIL-STAFF-FREEZE.md`,
   `docs/PIMPINAN-FREEZE.md`.

## Permukaan beku (modul superadmin)
Halaman:
- app/dashboard/units (+create, +[id])
- app/dashboard/users (+create, +[id])
- app/dashboard/lembaga
- app/dashboard/settings
Komponen:
- components/dashboard/SuperadminDashboard.tsx (home SUPERADMIN:
  range switcher, quick access semua modul, hero saldo konsolidasi, statistik,
  widget persetujuan, grafik global & komposisi pengeluaran, ringkasan per-unit,
  live feed, skeleton loading, kartu error + coba lagi)
- components/dashboard/useDashboardData.ts (hook data: `refetch(range?, unitId?)`,
  `activeRange`, `expenseByCategory`)
API:
- dashboard/aggregates, units (+[id]), users (+[id]),
  lembaga (+[id], +default), settings
Routing:
- app/dashboard/page.tsx — cabang role SUPERADMIN → `SuperadminDashboard`

## Perilaku yang dikunci
- Dashboard Superadmin (title "Executive Command Center"): range switcher
  Hari Ini / 7 Hari / 30 Hari / 90 Hari via `refetch(opt.value)`; quick access
  mencakup modul sistem Pengguna (`/dashboard/users`, hijau), Lembaga
  (`/dashboard/lembaga`, ungu), Pengaturan (`/dashboard/settings`, accent);
  hero "Kartu Saldo Konsolidasi"; "Arus Kas Global" (bar) + "Komposisi
  Pengeluaran" (doughnut `expenseByCategory`, maks 8 kategori); widget
  persetujuan pending (maks 5 item); "Ringkasan per Unit" via
  `UnitVirtualCard`; skeleton saat `loading && !data`; kartu error dengan
  tombol "Coba Lagi" memanggil `refetch()`.
- RBAC sistem: users edit/hapus HANYA SUPERADMIN; lembaga buat/ubah/hapus
  HANYA SUPERADMIN; settings kelola HANYA SUPERADMIN (dengan fallback tabel
  belum ada / `P2021` → default, agar theme tetap turun ke localStorage).
- Nav Superadmin: grup Sidebar "Sistem" berisi Unit, Pengguna, Lembaga,
  Pengaturan — kesemuanya SUPERADMIN-only.
- Data agregat SUPERADMIN melihat seluruh lembaga (`/api/dashboard/aggregates`
  tanpa filter unit).

## Catatan
- Komponen lintas-role yang juga dipakai dashboard lain
  (`PendingApprovalsWidget`, `UnitVirtualCard`, `StatTiles`,
  `QuickAccessGrid`, `LiveTransactionFeed`, `BarChart`, `DoughnutChart`,
  `ChartCard`, `chartOptions`) DIKUNCI di doc modul lain — jangan duplikasi
  perubahan ke file ini tanpa persetujuan doc terkait.