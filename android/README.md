# Alba Fintech — Android Native App

Native Android application for Alba Fintech, sharing the **same MySQL database** on Hostinger as the web app via existing NextAuth session auth.

## Scope
- **Target roles:** Pimpinan, Manager, Staff (+ Superadmin for Lembaga/Unit management)
- **Shared backend:** All data comes from `https://alba.brontolano.com/api/*` (MySQL database)
- **Auth method:** NextAuth-compatible flow — reuses existing `/api/auth/signin` session cookies
- **Min SDK:** API 24 (Android 7.0+)
- **UI:** Kotlin + Jetpack Compose

## Project Structure
```
android/                 # Native Android project (separate from Next.js)
├── app/
│   ├── src/main/
│   │   ├── AndroidManifest.xml
│   │   ├── Kotlin/          # All source:
│   │   │   ├── data/        # Remote (API), Local (SessionManager), Models
│   │   │   ├── ui/          # Compose screens + theme + viewmodels
│   │   │   ├── MainActivity.kt
│   │   │   └── AlbaFintechApp.kt
│   │   └── res/            # Layouts, strings, icons
├── build.gradle            # Module-level build config
└── settings.gradle

web/ (Next.js project)  →  android/  (Native Kotlin)
  Same MySQL DB ←→ same /api/* endpoints
```

## Shared Database
The Android app talks to the same REST API endpoints that the Next.js web app exposes (`/api/units`, `/api/transactions`, `/api/approvals`, `/api/lembaga`). No new database needed — the app reuses the existing MySQL database on Hostinger by calling the shared API.

## Building
```bash
cd android
./gradlew assembleRelease   # or ./gradlew assembleDebug
```
