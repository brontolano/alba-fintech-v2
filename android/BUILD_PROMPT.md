# 🏗️ Android Studio Build Prompt — Alba FIntech APK

> **Use this script** untuk membangun APK Alba Fintech langsung dari Android Studio **atau** command line.
> Cocok untuk developer yang baru pertama kali membuka project native Android di `android/`.

---

## ⚠️ Prasyarat Sistem

| Kebutuhan | Versi Minimum | Cara Cek |
|---|---|---|
| **Java (JDK)** | OpenJDK 25 (atau 17+) | `java -version` |
| **Android Studio** | Hedgehog 2023.1.1+ | Buka Android Studio → Help > About |
| **Android SDK** | API 34 (compileSdk 35) | Android Studio SDK Manager |
| **ANDROID_HOME** | Env var mengarah ke SDK | `echo %ANDROID_HOME%` |

> 💡 Jika `java -version` gagal, install **JDK 17+** dari [Adoptium](https://adoptium.net/).  
> Jika Android Studio belum terpasang, download dari [developer.android.com/studio](https://developer.android.com/studio).

---

## 📂 Langkah 1: Buka Project di Android Studio

```powershell
# Windows — buka folder android/ di Android Studio
& "C:\Program Files\Android\Android Studio\bin\studio64.exe" C:\AI\alba-fintech-v2\android
```

> Android Studio akan otomatis mendeteksi `settings.gradle` dan mengimpor project.  
> Biarkan proses **Gradle sync** selesai (biasanya 2-5 menit di koneksi cepat).

---

## 📦 Langkah 2: Build APK Debug (Command Line)

Setelah Gradle sync selesai, buka **Terminal di Android Studio** ( atau terminal PowerShell biasa ) lalu jalankan:

```powershell
# Masuk ke folder android
cd C:\AI\alba-fintech-v2\android

# Build APK debug
./gradlew assembleDebug
```

> APK akan dihasilkan di:
> `android/app/build/outputs/apk/debug/app-debug.apk`

Salin ke perangkat untuk diuji:

```powershell
# Salin APK ke perangkat Android via ADB (jika USB debugging sudah aktif)
adb install app/build/outputs/apk/debug/app-debug.apk
```

---

## 🔐 Langkah 3: Build APK Release (Production)

Untuk rilis ke production, buat keystore dan build signed APK:

```powershell
cd C:\AI\alba-fintech-v2\android

# 1. Generate keystore
keytool -genkeypair -v -keystore albafintech.keystore -alias alba-key -keyalg RSA -keysize 2048 -validity 10000

# 2. Tambahkan ke gradle.properties
# keyAlias=alba-key
# keyStorePassword=<password_anda>
# keyAliasPassword=<password_anda>

# 3. Build release APK
./gradlew assembleRelease
```

> APK release ada di:
> `android/app/build/outputs/apk/release/app-release.apk`

---

## 🔧 Langkah 4: Build via Android Studio GUI

1. Buka Android Studio → project `android/` terbuka otomatis
2. Pilih menu: **Build** → **Generate Signed Bundle / APK…**
3. Pilih **APK** → **Next**
4. Pilih **Debug** (untuk testing) atau **Release** (untuk produksi)
5. Klik **Finish**
6. Setelah selesai, klik **Locate** pada notifikasi yang muncul — buka folder `app/build/outputs/apk/...`

---

## 🛠️ Troubleshooting Umum

| Error | Solusi |
|---|---|
| `Could not find method 'com.android.application'` | Pastikan **Gradle sync** sudah berjalan. Buka **File → Sync Project with Gradle Files** |
| `JAVA_HOME is not set` | Set Environment Variable `JAVA_HOME` ke folder JDK 17+ |
| `Execution failed for task ':app:processDebugMainManifest'` | Cek `AndroidManifest.xml` di `app/src/main/` |
| `kotlinx-serialization` plugin error | Pastikan plugin `org.jetbrains.kotlin.plugin.serialization` sudah ada di `build.gradle` (level app) |
| Emulator tidak terhubung / `adb` tidak dikenali | Install **Android SDK Platform-Tools** via SDK Manager |

---

## 📱 Konfigurasi API Base URL

Default base URL sudah diset ke production:

```
https://alba.brontolano.com/
```

Untuk development lokal (misalnya `http://10.0.2.2:3000` untuk emulator), ubah di `local.properties`:

```properties
API_BASE_URL=http://10.0.2.2:3000/
```

> `10.0.2.2` = loopback ke `localhost` dari Android Emulator.

---

## 🔑 Catatan Penting: Mobile Auth Endpoint

> ⚠️ **ApiSerice.kt** memanggil `api/mobile/auth/login` — endpoint ini belum ada di web app.
> Web app menggunakan NextAuth v4 (`/api/auth/[...nextauth]/route.ts`).
> Anda perlu menambahkan endpoint mobile auth di web API agar login native berfungsi.
> Lihat file `android/app/src/main/kotlin/com/brontolano/albafintech/data/remote/ApiService.kt` baris 34.

---

**✅ Setelah semua langkah di atas selesai, Anda akan memiliki file APK yang dapat diinstall di perangkat Android untuk pengujian!**
