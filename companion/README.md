# ALBA NFC Scanner (aplikasi pendamping)

Aplikasi Android mini untuk HP kasir: **tempel kartu ASC mentah → browser
terbuka + data santri langsung ditemukan**. Tanpa reader USB, tanpa ubah
kartu, tanpa NDEF.

## Cara kerja

1. Aplikasi standby (foreground dispatch `MifareClassic` + `NfcA`).
2. Kartu ditempel → UID dibaca dari anti-collision (tanpa kunci, tanpa
   autentikasi sektor).
3. UID disalin ke clipboard (cadangan) + browser dibuka ke
   `https://alba.brontolano.com/dashboard/nfc?uid=UID` — halaman web yang
   sudah mendukung deep-link langsung lookup santri.

## Batasan (jujur)

- Hanya HP ber-chip NFC **NXP**. HP ber-chip Broadcom (sebagian Samsung /
  LG / Motorola lama) tidak bisa MIFARE Classic — pakai reader USB.
- Kartu harus kartu MIFARE Classic 1K (kartu ASC pesantren).
- Ganti `WEB_URL` di `MainActivity.kt` bila domain produksi berbeda.

## Dapat APK (tanpa install apa pun)

1. Buka GitHub repo → tab **Actions** → workflow **NFC Scanner APK**.
2. Pilih run terbaru (dari push yang menyentuh `companion/`) → unduh
   artifact **alba-nfc-scanner-debug**.
3. Kirim APK ke HP kasir (WA/Bluetooth) → install (izinkan "sumber tak
   dikenal") → buka aplikasi → tempel kartu untuk uji.

## Build manual (Android Studio)

1. Open project: folder `companion/alba-nfc-scanner`.
2. Run ▶ ke HP (USB debugging) atau Build → Build APK.
3. Butuh JDK 17 (diatur otomatis oleh Android Studio modern).

## Struktur

```
companion/alba-nfc-scanner/
├─ settings.gradle / build.gradle   (AGP 8.5.2, Kotlin 1.9.24)
├─ app/build.gradle                 (minSdk 24, tanpa dependensi)
└─ app/src/main/
   ├─ AndroidManifest.xml           (izin NFC + filter TECH_DISCOVERED)
   ├─ java/com/albafinance/nfcscanner/MainActivity.kt
   └─ res/xml/nfc_tech_filter.xml   (MifareClassic + NfcA)
```
