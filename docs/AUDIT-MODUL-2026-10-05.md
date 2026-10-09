# Audit Alur dan Modul ALBA Finance

Tanggal: 2026-10-05  
Scope: static audit source + regression suite; tanpa mutasi database production.

## Baseline

- `npm test`: 153 passed, 0 failed.
- Build production dengan environment deployment: berhasil.
- Audit ini menemukan celah yang belum tercakup test database-backed.

## Temuan prioritas

### HIGH — Akses balance lintas lembaga — DIPERBAIKI

`app/api/savings/balance/route.ts` sekarang memakai allowlist role eksplisit, membatasi MANAGER/STAFF ke `unitId`, dan membatasi PIMPINAN ke `lembagaId`. Role tanpa scope ditolak dengan 403.

### HIGH — Bukti transaksi dapat dibaca oleh semua user login

`app/uploads/[...path]/route.ts` dan `app/api/bukti/[filename]/route.ts` hanya memeriksa session. Tidak ada pemeriksaan kepemilikan file, transaksi, unit, atau lembaga. Filename yang diketahui/tertebak dapat membuka bukti transaksi privat.

Perbaikan yang disarankan: resolve file ke record transaksi dan terapkan scope role sebelum mengirim file. Hapus/redirect route legacy setelah seluruh pemanggil dipastikan aman.

### HIGH — Upload file terlalu terbuka

`app/api/upload/route.ts` mengizinkan semua user terautentikasi upload ke folder `inventory` atau `bukti`, dengan folder dipilih dari request. Belum ada role, unit, transaksi, atau workflow authorization.

Perbaikan yang disarankan: pisahkan endpoint upload inventory dan bukti, validasi role + unit + target record, batasi ukuran/tipe, dan tolak upload tanpa record yang valid.

### HIGH — Password reset belum berfungsi

`app/api/auth/forgot-password/route.ts` menerima email valid lalu mengembalikan mode unavailable. Tidak ada lookup user, OTP, pengiriman, verifikasi, atau reset password.

Perbaikan yang disarankan: tandai fitur unavailable secara eksplisit atau implementasikan alur OTP dengan expiry, rate limit, single-use token, dan audit log.

### HIGH — Handovers belum konsisten dengan scope lembaga

`app/api/handovers/route.ts` POST mempercayai `unitId` request dalam pembuatan handover. Role authorization dan validasi lembaga perlu disamakan dengan GET serta workflow PIMPINAN.

### Perubahan pada iterasi ini

- `app/api/savings/balance/route.ts`: scope lembaga/unit dan allowlist role diperketat.
- `app/api/users/[id]/route.ts`: GET user kini hanya mengizinkan SUPERADMIN, user itu sendiri, scope lembaga PIMPINAN, atau scope unit MANAGER/STAFF.
- `app/api/lembaga/route.ts`: non-SUPERADMIN hanya melihat lembaganya sendiri.
- `app/api/upload/route.ts`: role tak dikenal ditolak; validasi record ownership dan folder bukti masih menjadi iterasi berikutnya.

Verifikasi iterasi: `npm run type-check`, `npm test`, dan `git diff --check` — semuanya lulus; 153 test passed.

### HIGH — Batas hari memakai timezone server

`app/api/handovers/route.ts` dan `app/api/reconciliation/route.ts` memakai `new Date(`${date}T00:00:00`)` tanpa timezone. Ini berpotensi salah hari operasional jika timezone runtime bukan WIB. Bandingkan dengan helper shift KPAK yang sudah eksplisit memakai WIB.

### MEDIUM — GET user berdasarkan ID terlalu longgar

`app/api/users/[id]/route.ts` GET hanya memeriksa session. User terautentikasi dapat membaca metadata user lain lintas unit/lembaga jika ID diketahui.

### MEDIUM — Listing lembaga lintas organisasi

`app/api/lembaga/route.ts` GET mengembalikan semua lembaga aktif beserta hitungan unit/user untuk semua role terautentikasi.

### MEDIUM — Laporan mingguan tidak memakai minggu kalender/rolling window yang konsisten

`app/api/reports/aggregations/route.ts` membuat bucket rolling tetapi memasukkan tanggal menggunakan `Math.ceil(d.getDate() / 7)`, sehingga bucket reset setiap bulan dan bisa salah di batas bulan.

### MEDIUM — Budget GET N+1 dan filter overlap di aplikasi

`app/api/kpak/budget-submit/route.ts` mengambil semua alokasi aktif, menyaring overlap di aplikasi, lalu menjalankan aggregate transaction per alokasi. Ini dapat memburuk saat data bertambah.

### LOW — JWT mempertahankan role saat DB outage

`app/api/auth/options.ts` mempertahankan data token lama jika revalidasi DB gagal. Ini menghindari mass logout, tetapi demosi/deaktivasi tidak langsung berlaku selama outage.

## Modul yang diaudit

- Auth, dashboard, settings, users, lembaga, SUPERADMIN, PIMPINAN
- KPAK: students, finance/services, budget, shift, workflow, review, reconciliation, close-day, reports, handovers
- Retail, POS, savings, NFC, inventory, uploads, dan API authorization

## Gaps verifikasi

- Belum ada akun uji per role untuk E2E login dan browser flow.
- Test yang ada dominan static/source-presence dan helper authorization; belum cukup untuk verifikasi query database lintas lembaga.
- Tidak ada perubahan production atau database selama audit.

## Urutan perbaikan yang disarankan

1. Tutup akses lintas lembaga pada savings balance, users, lembaga, handovers.
2. Tutup akses upload dan pembacaan bukti transaksi berdasarkan record ownership/scope.
3. Standardisasi timezone WIB pada handover/reconciliation/reports.
4. Tambahkan test authorization database-backed untuk setiap temuan HIGH/MEDIUM.
5. Putuskan implementasi atau penonaktifan resmi password reset.
6. Optimalkan budget aggregate dan perbaiki bucket laporan mingguan.
7. Uji browser end-to-end per role di staging.
