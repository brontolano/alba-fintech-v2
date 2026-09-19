# Rencana Perbaikan Superadmin dan Demo Data

## Tujuan

Menjadikan SUPERADMIN role tertinggi dengan full access, memperbaiki manajemen data (backup, restore, reset, demo data), dan menyediakan data contoh baru untuk KPAK, Kantin Baru, Kantin Umi, dan Koperasi Buku.

## Fase

- [completed] Audit route, schema, UI, dan seed yang sudah ada
- [completed] Perbaiki RBAC dan endpoint manajemen data
- [completed] Implementasikan seed demo yang aman dan konsisten
- [completed] Sambungkan tombol UI Superadmin dan Pengaturan
- [completed] Validasi typecheck, build, dan smoke test lokal
- [completed] Siapkan catatan deployment/live verification

## Result

Data demo empat unit sudah dibuat dan diverifikasi pada database terkonfigurasi. Production build dan typecheck lulus.

## Errors Encountered

| Error                                        | Attempt | Resolution                                                         |
| -------------------------------------------- | ------: | ------------------------------------------------------------------ |
| MCP Serena tidak tersedia sebagai tool aktif |       1 | QA dilakukan dengan semantic/text search dan executable validation |
