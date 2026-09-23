# KUNCI MODUL RETAIL (POS/TOKO) — JANGAN UBAH TANPA PERSETUJUAN PEMILIK

Status: **FIX / FINAL** per instruksi pemilik.
Baseline: commit `9005f8a`.

## Aturan penguncian
1. File di bawah adalah permukaan beku modul RETAIL (toko). Pengembangan
   lain (KPAK, lembaga, unit baru) **dilarang** mengubah perilaku file ini.
2. Bila perubahan tak terhindarkan (mis. refactor bersama), wajib:
   - Minta persetujuan eksplisit pemilik TERLEBIH DULU, dan
   - Pastikan `npm test` tetap hijau (test `retail-freeze.test.ts`
     gagal = perubahan DITOLAK otomatis).
3. Untuk kebutuhan baru, tambah file/route BARU — jangan ubah yang beku.
4. Rollback: `git diff 9005f8a -- <path>` untuk cek penyimpangan;
   `git checkout 9005f8a -- <path>` untuk kembalikan satu file.

## Permukaan beku (retail)
Halaman: dashboard/pos (+shift), dashboard/inventory (+create, +[id]/edit),
dashboard/transactions (routing umum — cek pos guard), profile.
API: pos/shift, smartpay, inventory (+[id]).
Bersama: use-page-guard (guard retail MANAGER/STAFF), Sidebar (grup Toko),
MobileNav (POS pusat retail).

## Perilaku yang dikunci (ringkas)
- Pack rutin POS retail: harga dari katalog, scan barcode/SKU, metode
  pembayaran cash & smartcard, stok dikurangkan atomik, total hitung dari
  DB (bukan body).
- Shift kasir retail: buka/tutup per hari WIB, reuse tabel
  `ShiftAttendance` tanpa mengubah skema; satu baris per [unitId, userId, date].
- SmartPay: debit saldo tabungan + pencatatan INCOME + kurangi stok dalam
  SATU transaksi Prisma; channel SMART_CARD; guard saldo & stok di dalam
  transaksi (anti race).
- Card UID selalu di-upper-case (normalisasi identitas kartu).
- Halaman POS hanya untuk unit retail (role MANAGER/STAFF); redirect
  keluar bila bukan retail.
- Inventori: SKU unik, currentStock tak boleh negatif.

## Catatan integrasi
- Tabel `ShiftAttendance` dipakai bersama KPAK (service TABUNGAN/KEUANGAN)
  dan retail (tanpa service). Jangan ubah skema atau perilaku gate KPAK.
- `ShiftLock`/`useShiftGate` adalah milik KPAK — retail TIDAK memakainya.
- Sidebar/MobileNav juga dikunci oleh docs/KPAK-STAFF-FREEZE.md; jangan
  ubah struktur tanpa persetujuan ganda.