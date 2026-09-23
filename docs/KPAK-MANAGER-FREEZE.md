# KUNCI MODUL MANAGER KPAK — JANGAN UBAH TANPA PERSETUJUAN PEMILIK

Status: **FIX / FINAL** per instruksi pemilik.
Baseline: tag git `kpak-manager-freeze-v1` (dibuat setelah commit penguncian).

Bersama `docs/KPAK-STAFF-FREEZE.md`, seluruh **MODUL KPAK dinyatakan FIX**:
- MODUL KPAK - STAFF → `docs/KPAK-STAFF-FREEZE.md`
- MODUL KPAK - MANAGER → dokumen ini

## Aturan penguncian
1. File di bawah adalah permukaan beku modul MANAGER. Pengembangan lain
   **dilarang** mengubah perilaku file ini.
2. Bila perubahan tak terhindarkan, wajib:
   - Minta persetujuan eksplisit pemilik TERLEBIH DULU, dan
   - Pastikan `npm test` tetap hijau (test `manager-freeze.test.ts`
     gagal = perubahan DITOLAK otomatis).
3. Untuk kebutuhan baru, tambah file/route BARU — jangan ubah yang beku.
4. Rollback: `git diff kpak-manager-freeze-v1 -- <path>` untuk cek
   penyimpangan; `git checkout kpak-manager-freeze-v1 -- <path>` untuk
   kembalikan satu file.

## Permukaan beku (manager)
Halaman: dashboard (routing+KpakManagerDashboard), kpak/workflow,
kpak/review, kpak/close-day, kpak/my-budget, kpak/crew,
approvals, reconciliation, handovers.
API: approvals (+[id]), handovers (+[id]), kpak/shift,
kpak/shift-reports, kpak/reconcile, kpak/allocations,
kpak/budget-submit, transactions (aturan auto-approve KPAK).
Bersama: KpakManagerDashboard, Sidebar (MANAGER_KPAK_GROUPS + badge),
lib/kpak-phase, use-page-guard.
Schema: BudgetAllocation.source (KPAK/LEMBAGA), Unit.type.

## Perilaku yang dikunci (ringkas)
- Sidemenu Manager KPAK (9 item, urut linimasa): Pusat Kerja,
  Kru & Kinerja, Perlu Keputusan, Tutup Hari, Anggaran Saya,
  Rekap & Laporan, Data Santri, Profil, Keluar.
- Badge pantau: kuning = antrean keputusan, hijau = kru bertugas.
  Tanpa polling frontend (refresh saat navigasi + tombol manual).
- Pusat Kerja: 5 langkah per fase (Pagi/Operasional/Penutupan/Selesai),
  1 aksi utama per langkah, Akses Cepat 8 ikon.
- Perlu Keputusan: satu antrean + badge Operasional/Anggaran + umur tunggu.
- Tutup Hari: wizard 3 langkah, konfirmasi dua ketuk, serah terima otomatis.
- Anggaran Saya: sisa alokasi + badge sumber dana + status pengajuan.
- Kru & Kinerja: daftar kru + kinerja per staff, read-only.
- Expense Unit KPAK selalu auto-approve; hanya pengajuan ke pimpinan +
  anggaran yang lewat approval.
- Alokasi punya sumber dana (Kas KPAK / Kas Lembaga) pilihan pimpinan.
- Tombol utama min 48px; jarak antar tombol destruktif min 12px.
