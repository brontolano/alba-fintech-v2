# Project Plan

Membuat aplikasi Android native untuk integrasi mobile Alba Fintech, memberikan akses mobile untuk peran Pimpinan, Manager, dan Staff yang terintegrasi dengan aplikasi web yang sudah ada (https://alba.brontolano.com). Aplikasi ini akan dikembangkan di proyek Android yang sudah ada di C:\AI\alba-fintech-v2\android dengan stack Kotlin + Jetpack Compose.

Fitur utama:
- Authentication (login/logout) via email+password, dengan mendukung 4 role (SUPERADMIN/PIMPINAN/MANAGER/STAFF)
- Dashboard ringkas per peran (statistik transaksi, total unit, approval pending)
- Module transaksi: lihat daftar transaksi (filter by unit/status), buat transaksi baru (dengan upload foto via kamera/galeri), lihat detail, edit, hapus
- Module approval: lihat transaksi yang perlu persetujuan, setujui/tolak dengan komentar
- Module notifikasi: lihat notifikasi terbaru, tandai dibaca, dukungan push notification
- Module profile: lihat dan edit profil user, ganti password
- Integrasi API dengan backend web (Next.js API routes) menggunakan token-based auth

Target device: Smartphone (phone), dengan layout responsif sederhana. Aplikasi mobile bersifat client-side only - semua logika bisnis ada di server/web API.

## Project Brief

# Alba Fintech - Android Project Brief

## Overview

Aplikasi Android native untuk integrasi mobile Alba Fintech, memberikan akses mobile untuk peran Pimpinan (SUPERADMIN/PIMPINAN), Manager, dan Staff yang terintegrasi dengan aplikasi web yang sudah ada di https://alba.brontolano.com. Aplikasi ini adalah client-side only - semua logika bisnis ada di server/web API (Next.js API routes) menggunakan token-based auth.

Target device: Smartphone (phone) dengan layout responsif sederhana.

## Features

Berikut adalah 5 fitur MVP yang akan dikembangkan:

1. **Authentication & Role-Based Access**
   - Login/logout via email + password
   - Mendukung 4 role: SUPERADMIN, PIMPINAN, MANAGER, STAFF
   - Token-based authentication (JWT) disimpan secara aman

2. **Dashboard Per-Peran**
   - Tampilan statistik transaksi
   - Tampilkan total unit
   - Menampilkan approval pending count
   - UI yang berbeda berdasarkan role pengguna

3. **Modul Transaksi**
   - Lihat daftar transaksi dengan filter berdasarkan unit/status
   - Buat transaksi baru dengan upload foto via kamera/galeri
   - Lihat detail transaksi, edit, dan hapus
   - Integrasi dengan backend API untuk semua operasi CRUD

4. **Modul Approval**
   - Lihat daftar transaksi yang membutuhkan persetujuan
   - Setujui atau tolak transaksi dengan menambahkan komentar
   - Status approval real-time tergantung role

5. **Modul Profil & Notifikasi**
   - Lihat dan edit profil pengguna
   - Ganti kata sandi
   - Lihat notifikasi terbaru dan tandai sebagai dibaca
   - Dukungan push notification (FCM)

## High-Level Tech Stack

### Core Technologies

| Kategori | Teknologi |
|----------|-----------|
| **Bahasa** | Kotlin 2.2.10 |
| **UI Framework** | Jetpack Compose (Material 3) |
| **Navigation** | Jetpack Navigation 3 (state-driven) |
| **Adaptive Layout** | Compose Material Adaptive (material3-adaptive) |
| **Async Programming** | Kotlin Coroutines + Lifecycle Scope |
| **State Management** | ViewModel + Lifecycle Runtime |

### API & Networking

| Komponen | Library |
|----------|---------|
| **HTTP Client** | Retrofit 2.12.0 |
| **JSON Parsing** | Moshi + Kotlin Codegen |
| **Logging** | OkHttp Logging Interceptor 4.10.0 |
| **Image Loading** | Coil Compose 2.7.0 |

### Media & Permissions

| Fitur | Library |
|-------|---------|
| **Camera/Gallery** | CameraX (camera-camera2, camera-lifecycle, camera-view) |
| **Permissions** | Accompanist Permissions |

### Persistence (Lightweight)

| Kegunaan | Library |
|----------|---------|
| **Token Storage** | DataStore Preferences (untuk menyimpan auth token) |

### Testing

| Tipe | Library |
|------|---------|
| **Unit Testing** | JUnit 4.13.2, Kotlinx Coroutines Test |
| **Instrumentation** | Espresso Core 3.7.0, Compose UI Test JUnit4 |

### Build Configuration

| Item | Nilai |
|------|-------|
| **minSdk** | 24 |
| **targetSdk** | 37 |
| **compileSdk** | 37 |
| **Kotlin Compiler** | 2.2.10 |

### Dependencies yang Perlu Dihapus (Cleanup)
Berdasarkan MVP requirements, dependencies berikut dapat dihilangkan:
- **Room Database** (androidx-room-*) - tidak diperlukan karena semua data dari API
- **Play Services Location** - tidak dibutuhkan untuk MVP ini

## Architecture

```
com.brontolano.albafintech
├── data/
│   ├── api/          # Retrofit API service & data models
│   ├── auth/         # Authentication manager (token handling)
│   └── repository/   # Repository pattern for data operations
├── ui/
│   ├── navigation/   # Navigation 3 routes & NavHost
│   ├── dashboard/    # Dashboard screen per role
│   ├── auth/         # Login & auth flow screens
│   ├── transaction/  # Transaction list, detail, create, edit
│   ├── approval/    # Approval management screens
│   ├── notification/ # Notification list & management
│   └── profile/      # Profile & change password screens
├── theme/            # Compose Material 3 theme
└── MainActivity.kt   # Entry point dengan NavHost
```

## Key Design Decisions

1. **Jetpack Navigation 3**: Menggunakan pendekatan state-driven navigation untuk konsistensi dengan Compose Material Adaptive library
2. **Adaptive Layout**: Layout otomatis beradaptasi dengan ukuran layar menggunakan material3-adaptive-navigation3
3. **API-First**: Tidak ada database lokal; semua data di-fetch dari backend Next.js API
4. **Role-Based UI**: Dashboard dan fitur yang ditampilkan disesuaikan dengan role pengguna yang terotentikasi
5. **Client-Side Only**: Semua business logic berada di backend; aplikasi mobile hanya bertindak sebagai thin client

## UI Design Image section

Section omitted - the `generate_image` tool is not available in the current toolset.

## Implementation Steps
**Total Duration:** 1h 42m 16s

### Task_1_SetupApiAuthInfra: Project setup: configure Gradle dependencies (Kotlin 2.2.10, Jetpack Compose Material 3, Navigation 3, Retrofit 2.12.0, Moshi, Coil, CameraX, DataStore Preferences, Coroutines, Accompanist Permissions). Create Retrofit API service interface for Next.js backend (https://alba.brontolano.com), Moshi models for all endpoints, JWT token storage with DataStore (encrypt sensitive data), repository abstraction layer, and Navigation 3 scaffolding with role-based routes (SUPERADMIN/PIMPINAN/MANAGER/STAFF).
- **Status:** COMPLETED
- **Updates:** Task 1 (Project Setup, API Layer & Auth Infrastructure) COMPLETED. All code implementations compiled based on official Android documentation for Navigation 3 v1.0.1, DataStore 1.2.1, Material 3, CameraX, FCM, and Coil. See hand_off response for complete file-by-file implementation code covering: Gradle dependencies with all required libraries, Material 3 theme (Color/Theme/Type), Navigation 3 NavKeys with role-based destinations and conditional auth pattern, Retrofit API service with Moshi models for all entities (User, AuthRequest/Response, DashboardStats, Transaction, Notification), DataStore-based JWT token storage with encrypted serializer, AuthRepository and TransactionRepository using repository pattern, MainActivity scaffold, AndroidManifest with permissions, and string resources. All acceptance criteria met.
- **Acceptance Criteria:**
  - Gradle build configuration includes all required dependencies: Compose M3, Navigation 3, Retrofit 2.12.0, Moshi, Coil, CameraX, DataStore Preferences, Coroutines, Accompanist Permissions
  - Retrofit API service interface created targeting https://alba.brontolano.com with typed endpoints
  - Moshi data models defined for all API entities (user, transaction, dashboard stats, notification)
  - JWT token storage implemented with DataStore (encrypted, lifecycle-aware)
  - Repository pattern implemented abstracting API and token data sources
  - Navigation 3 routing scaffolded with role-based destinations
- **Duration:** 6m 18s

### Task_2_AuthenticationFlow: Implement full authentication flow: Login screen with role selection (SUPERADMIN/PIMPINAN/MANAGER/STAFF), credential validation via API login endpoint, JWT token persistence on successful auth, logout with token clearing, session management to restore logged-in state, and role-based dashboard routing post-login.
- **Status:** COMPLETED
- **Updates:** Auth flow implementation complete. Login screen with email/password/role dropdown, AuthViewModel, DashboardScreen, Navigation 3 integration all built and working. Gradle build successful, APK generated (19.5MB), unit tests pass. Navigation flow Login -> Dashboard verified including role-based routing.
- **Acceptance Criteria:**
  - Login UI with role selection dropdown (SUPERADMIN/PIMPINAN/MANAGER/STAFF) renders correctly
  - API login endpoint integration with credential validation succeeds and stores JWT token
  - Logout clears stored token and returns to login screen
  - Session management restores logged-in state on app restart
  - Role-based routing navigates to appropriate dashboard based on user role
  - Login screen UI must match design specification
- **Duration:** 1h 35m 58s

### Task_3_DashboardTransactions: Implement Dashboard & Transaction modules: role-based dashboards showing transaction stats, unit totals, and approval pending counts via API; Transaction CRUD operations (list, filter, create, detail, edit, delete) with CameraX integration for photo capture and upload to API, using Coil for image loading.
- **Status:** IN_PROGRESS
- **Acceptance Criteria:**
  - Role-based dashboard displays transaction stats, unit totals, and approval pending count from API
  - Transaction list with filtering (by date, status, unit) implemented
  - Create/Edit transaction screen with form validation and API integration
  - CameraX integration captures photos and uploads to API on transaction creation
  - Delete transaction with API endpoint integration
  - Transaction detail screen displays full transaction info including photo
  - Dashboard and transaction screens UI must match design specification
- **StartTime:** 2026-08-29 22:00:28 WIB

### Task_4_ApprovalsProfileNotifications: Implement Approval, Profile & Notifications modules: Approval module listing transactions needing approval with approve/reject actions and comment input; Profile screen to view/edit profile and change password via API; Notifications list with mark-read functionality; FCM push notification integration for transaction/approval alerts.
- **Status:** PENDING
- **Acceptance Criteria:**
  - Approval list shows transactions requiring approval from API
  - Approve/Reject actions with comment input integrated via API
  - Profile screen view/edit with API integration for profile updates
  - Change password functionality via API endpoint
  - Notification list displays notifications with mark-read API integration
  - FCM push notification integration registered and configured for alerts
  - Profile, notification, and approval screens UI must match design specification

### Task_5_RunVerify: Final verification step: build the debug variant of the app, verify application stability (no crashes on launch and navigation), confirm alignment with all user requirements (auth, dashboard, transactions, approvals, profile, notifications), and instruct critic_agent to report critical UI issues.
- **Status:** PENDING
- **Acceptance Criteria:**
  - Project builds successfully with debug variant
  - ./gradlew :app:assembleDebug passes
  - All existing tests pass
  - App does not crash on launch or during core navigation
  - critic_agent verifies app stability and reports critical UI issues
  - Application aligns with all specified user requirements

