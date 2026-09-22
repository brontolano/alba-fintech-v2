# KUNCI MODUL STAFF — JANGAN UBAH TANPA PERSETUJUAN PEMILIK

Status: **FIX / FINAL** per instruksi pemilik.
Baseline: tag git `kpak-staff-freeze-v1`.

## Aturan penguncian
1. File di bawah adalah permukaan beku modul STAFF. Pengembangan lain
   (manager, pimpinan, unit baru) **dilarang** mengubah perilaku file ini.
2. Bila perubahan tak terhindarkan (mis. refactor bersama), wajib:
   - Minta persetujuan eksplisit pemilik TERLEBIH DULU, dan
   - Pastikan `npm test` tetap hijau (test `staff-freeze.test.ts`
     gagal = perubahan DITOLAK otomatis).
3. Untuk kebutuhan baru, tambah file/route BARU — jangan ubah yang beku.
4. Rollback: `git diff kpak-staff-freeze-v1 -- <path>` untuk cek
   penyimpangan; `git checkout kpak-staff-freeze-v1 -- <path>` untuk
   kembalikan satu file.

## Permukaan beku (staff)
Halaman: dashboard (routing+KpakStaffDashboard), kpak/students (+new,+[id]),
savings, kpak/finance, kpak/internal (redirect), kpak/shift, kpak/reports,
kpak/budget (guard: BUKAN staff), profile.
API: savings/*, financial-categories (+seed-kpak), kpak/pay-service,
kpak/shift, kpak/shift-reports, kpak/reconcile, kpak/allocations,
transactions, upload, bukti/[filename].
Bersama: KpakStaffDashboard, ShiftLock, useShiftGate, Sidebar (grup +
filter shift), MobileNav (5 item KPAK), kpak-shift-gate, upload-proof,
upload-drive, use-page-guard.
Schema: ShiftAttendance(+service), ShiftReport(+status), BudgetAllocation
(+periodType/title/range), SavingsTransaction(channel+photoUrl),
SavingsAccountStatus(FROZEN), tabel shift_reports/budget_allocations.

## Perilaku yang dikunci (ringkas)
- Bottom nav KPAK: Beranda Santri Shift Saya Rekap Profil.
- Staff tanpa check-in: layanan disembunyikan; ikut layanan shift.
- Tabungan: setor Tunai/Bank, tarik tunai-only. Keuangan: Tunai/Bank/
  Tabungan; Internal tunai-only tanpa HER/Daful.
- Rekonsiliasi: laci = cash-only; bank terpisah.
- Pengajuan Anggaran: BUKAN untuk staff (menu + guard).
- Default kategori: HER/SPP, Daftar Ulang, Transaksi Internal ×2.
