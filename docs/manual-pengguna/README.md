# Manual Pengguna — ALBA Finance v7

Panduan penggunaan Aplikasi Keuangan Pondok Pesantren Al-Basyariyah berdasarkan peran pengguna. Setiap peran punya file panduan sendiri (lengkap dengan screenshot).

## Daftar Panduan per Peran

| Peran | File | Isi |
|-------|------|-----|
| SUPERADMIN | [01-superadmin.md](01-superadmin.md) | Kelola unit, pengguna, lembaga, pengaturan |
| PIMPINAN | [02-pimpinan.md](02-pimpinan.md) | Pantau lembaga, setujui pengajuan, laporan |
| MANAGER (KPAK & Retail) | [03-manager.md](03-manager.md) | Operasional harian unit |
| STAFF (KPAK & Retail) | [04-staff.md](04-staff.md) | Tugas harian: shift, kasir, stok, layanan |

## Cara Masuk (semua peran)

1. Buka alamat aplikasi di browser (Chrome/Edge disarankan).
2. Isi **Email** dan **Password**, klik **MASUK**.

![Halaman login](screenshots/01-login.png)

3. Setelah berhasil, Anda masuk ke **Dashboard** sesuai peran.
4. Untuk keluar, klik menu **Keluar** di sidebar.

## Akun Demo (lingkungan latihan)

| Peran | Email | Password |
|-------|-------|----------|
| SUPERADMIN | `admin@brontolano.com` | `bismillah` |
| PIMPINAN | `pimpinan@alba.app` | `bismillah` |
| MANAGER KPAK | `manager.kpak@alba.app` | `bismillah` |
| MANAGER Koperasi Buku | `manager.koperasi@alba.app` | `bismillah` |
| MANAGER Kantin Umi | `manager.kantinumi@alba.app` | `bismillah` |
| MANAGER Kantin Baru | `manager.kantinbaru@alba.app` | `bismillah` |
| STAFF KPAK | `staff.kpak@alba.app` | `bismillah` |
| STAFF Koperasi Buku | `staff.koperasi@alba.app` | `bismillah` |
| STAFF Kantin Umi | `staff.kantinumi@alba.app` | `bismillah` |
| STAFF Kantin Baru | `staff.kantinbaru@alba.app` | `bismillah` |

> Password bisa diubah oleh SUPERADMIN via `Sistem → Pengguna → Edit`. Nonaktifkan akun demo saat aplikasi sudah live.

## Struktur Unit

```
Pondok Pesantren Al-Basyariyah
 └─ Lembaga
     ├─ KPAK (layanan administrasi & tabungan santri)
     ├─ Koperasi Buku (retail)
     ├─ Kantin Umi (retail)
     └─ Kantin Baru (retail)
```
