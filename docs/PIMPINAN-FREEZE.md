# KUNCI MODUL PIMPINAN — JANGAN UBAH TANPA PERSETUJUAN PEMILIK

Status: **FIX / FINAL** per instruksi pemilik (baseline: modul Pimpinan selesai
pada fase akhir Belanja Stok — dashboard, persetujuan, pengumuman, laporan).
Referensi desain: `docs/DESAIN-RETAIL-STAFF.md`,
`docs/PIMPINAN-DASHBOARD-SPEC.md` (bila belum dibuat, perilaku dikunci apa
adanya di titik ini).

## Aturan penguncian
1. File di bawah adalah permukaan final modul PIMPINAN. Pengembangan lain
   **dilarang** mengubah perilakunya.
2. Bila perubahan tak terhindarkan, wajib:
   - Minta persetujuan eksplisit pemilik TERLEBIH DULU, dan
   - Pastikan `npm test` tetap hijau (test `pimpinan-freeze.test.ts`
     gagal = perubahan DITOLAK otomatis).
3. Kebutuhan baru = file/route BARU — jangan ubah yang beku.
4. File yang sudah beku di doc lain tetap dikunci di doc-nya masing-masing:
   `docs/RETAIL-STAFF-FREEZE.md` (Belanja Stok sisi retail — halaman
   `retail/belanja` + `purchase-requests`, POS, konsinyasi, dst),
   `docs/RETAIL-FREEZE.md`, `docs/KPAK-STAFF-FREEZE.md`, `docs/KPAK-MANAGER-FREEZE.md`.

## Permukaan beku (modul pimpinan)
Halaman:
- app/dashboard/approvals (persetujuan lembaga) + approvals/audit (riwayat)
- app/dashboard/announcements (pengumuman / broadcast)
- app/dashboard/monitor (papan pantau)
Komponen:
- components/dashboard/PimpinanDashboard.tsx (home Pimpinan: statistik,
  indikator KPI, quick access, widget persetujuan, ringkasan per-unit, live feed)
- components/dashboard/PendingApprovalsWidget.tsx
Lib:
- lib/modules/approvals/scope.ts
- lib/modules/reports/scope.ts
API:
- approvals (+[id], +audit), broadcast (+[id]), monitor
Routing:
- app/dashboard/page.tsx — cabang role PIMPINAN → `PimpinanDashboard`

## Perilaku yang dikunci
- Scope lembaga-wide: PIMPINAN melihat pengajuan & riwayat persetujuan SEMUA
  unit di lembaganya (`buildApprovalScope` cabang PIMPINAN → `unitId in
  lembagaUnitIds` + `approverId`); laporan SEMUA unit di lembaganya
  (`buildReportScope` cabang PIMPINAN → `unitFilter in` lembaga).
- Dashboard Pimpinan: header "Dashboard Eksekutif / Pimpinan Lembaga";
  quick access berisi "Belanja" (`/dashboard/retail/belanja`, warna hijau)
  selain Input Data / Buku Kas / Papan Pantau / Laporan / Pengumuman /
  Persetujuan / Unit / Kategori / Pegawai; widget persetujuan pending;
  kartu per-unit dengan detailHref `/dashboard/reports?unit=<id>`.
- Broadcast: hanya SUPERADMIN/PIMPINAN; PIMPINAN hanya untuk lembaganya
  sendiri (buat/lihat/hapus dibatasi `lembagaId`).
- Persetujuan: PIMPINAN dapat approve/reject pengajuan seluruh unit lembaga;
  delete hanya pengajuan milik lembaganya sendiri.
- Nav Pimpinan: grup Sidebar "Kelola" (termasuk "Belanja Stok") + tautan
  "Persetujuan" (`/dashboard/approvals`).

## Catatan
- Alur Belanja Stok sisi Pimpinan (halaman + `purchase-requests`) DIKUNCI di
  `docs/RETAIL-STAFF-FREEZE.md` — jangan duplikasi ke file baru tanpa
  persetujuan kedua doc tersebut.