# Modul NFC — Desain & Implementasi

Modul NFC menyatukan alur **"Tempel Kartu"** (scan via Web NFC) dan **"Input Text"**
(masuk UID manual via keyboard/reader USB) menjadi satu komponen reusable, dipakai
di semua titik input UID kartu santri.

## Pangkal: `lib/nfc.ts`

| Fungsi | Peran |
|--------|-------|
| `normalizeUid(uid)` | Trim, hapus semua separator (`\s : . -`), `toUpperCase`. Hasilnya konsisten antar form. |
| `isWebNfcSupported()` | Guard `"NDEFReader" in window` (browser/HTTPS saja). |
| `scanNfcUid()` | Baca kartu via `NDEFReader` (timeout 30 dtk, auto-cancel). |
| `NfcError` | Error dengan kode `WEB_NFC_UNSUPPORTED`, `NFC_TIMEOUT`, `NFC_READ_FAILED`, dll. |

### Web NFC — batasan penting
- `NDEFReader` **tidak mengekspos UID mentah** (rahasia keamanan Web NFC).
- `scanNfcUid()` membaca **record NDEF teks/URL** sebagai representasi UID.
- Akibatnya, kartu UID polos (tanpa record NDEF) hanya bisa dibaca lewat:
  1. **Reader USB keyboard-wedge** → menggantikan keyboard, mengetik UID + Enter
     (jalan `onEnter` komponen).
  2. Input manual (`NfcUidInput`, jalur "masukkan UID").
- Jadi `NfcUidInput` selalu menampilkan field teks; tombol **"Tempel"** muncul hanya
  bila `isWebNfcSupported()` true.

## Komponen `components/nfc/NfcUidInput`

| Prop | Tipe | Fungsi |
|------|------|--------|
| `value` / `onChange` | string / (string)=>void | Kontrol controlled |
| `onEnter` | ()=>void | Submit saat Enter (mis. `handleSmartPay`) |
| `placeholder` | string | Placeholder input |
| `showHint` | boolean (default true) | Teks bantuan mode pembaca berpindah secara dinamis |
| `buttonLabel` | string | Label default tombol "Tempel" |
| `label` | string | Label di atas field |
| `className` | string | Kelas tambahan pada kontainer flex |

Perilaku:
- Input `font-mono` agar UID mudah dibaca.
- Tombol "Tempel" (ikon `Nfc`): panggil `scanNfcUid`, beri toast "Kartu terbaca · UID …",
  isi `onChange`, lalu fokus kembali ke input.
- Saat scanning tombol memakai `Loader2` + "Membaca…".
- Enter input → `onEnter` (di POS langsung memicu `handleSmartPay`).

## Halaman `app/dashboard/nfc/page.tsx`
- Guard RBAC: semua role login.
- Tombol tempel besar + field manual `NfcUidInput`.
- Setelah UID didapat: tombol **"Cari Santri dari UID"** → `GET /api/savings/lookup?cardUid=`.
- Panel hasil santri: nama/kelas/saldo/status, peringatan bila UID tersimpan ≠ UID diinput,
  link cepat ke Detail Santri, Tabungan, dan POS.
- Kartu panduan 3 mode pembaca (Web NFC / reader USB / manual).

## Titik Integrasi
| Layar | Perubahan |
|-------|-----------|
| Sidebar | NavItem "Modul NFC" (`/dashboard/nfc`, semua role) |
| POS (`app/dashboard/pos/page.tsx`) | Input smartcard → `NfcUidInput`; `normalizeUid(smartCardUid)` di `handleSmartPay`; `onEnter={handleSmartPay}` |
| Tabungan (`app/dashboard/savings/page.tsx`) | Input UID registrasi → `NfcUidInput`; tombol "Tempel" di baris pencarian; lookup menerima `keyOverride` hasil scan; `normalizeUid` di registrasi |
| Data Santri KPAK — baru (`kpak/students/new/page.tsx`) | Input UID → `NfcUidInput`; `normalizeUid` saat POST |
| Data Santri KPAK — detail (`kpak/students/[id]/page.tsx`) | Input UID edit → `NfcUidInput`; `normalizeUid` saat PATCH |

## Server
- `app/api/savings/lookup/route.ts`: cocokan `cardUid` **atau** `cardUid` tanpa separator
  (`in: [uid, uid.replace(/[\s:.\-]/g, "")]`); tetap `toUpperCase` di awal.
- `app/api/smartpay/route.ts`: bila lookup pertama gagal, coba kembali dengan UID tanpa
  separator; `toUpperCase` dipertahankan.

## Posisi NFC tambahan (di luar freeze)
- KPAK: pencarian keuangan di halaman rekap belum memakai kartu — dapat ditambahkan
  `NfcUidInput` bila dibutuhkan (di luar lingkup freeze).