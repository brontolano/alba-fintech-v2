# 🛠 Sprint 1 — Prisma Schema (S1-T02)

**Oleh:** @cto (Pak Indra)  
**Tanggal:** 2026-09-09  
**Status:** ✅ SELESAI

## Ringkasan

Schema Prisma v4 telah dibuat di `alba-fintech-v4-app/prisma/schema.prisma` dengan 14 model + 6 enums.

## Daftar Model

| Model | Deskripsi |
| ------- | ----------- |
| `Lembaga` | Organisasi induk |
| `Unit` | Sub-unit (RETAIL/KPAK/OFFICE) |
| `User` | Pengguna dengan role |
| `FinancialCategory` | Kategori INCOME/EXPENSE/TRANSFER |
| `BankAccount` | Akun bank/cash per unit |
| `Transaction` | Transaksi utama dengan orderItems JSON |
| `Approval` | Persetujuan transaksi |
| `FinancialNote` | Catatan cepat pimpinan |
| `InventoryItem` | Barang inventori |
| `OrderItem` | Item dalam order/POS |
| `Notification` | Notifikasi dalam aplikasi |
| `PushSubscription` | Web push subscription |
| `BroadcastMessage` | Pesan broadcast |
| `AuditLog` | Audit trail |
| `SystemSetting` | Pengaturan sistem |
| `UnitSetting` | Pengaturan per unit |

## Enums

- `Role`: SUPERADMIN, PIMPINAN, MANAGER, STAFF
- `TransactionType`: INCOME, EXPENSE, TRANSFER
- `TransactionStatus`: DRAFT, PENDING, APPROVED, REJECTED
- `UnitType`: RETAIL, KPAK, OFFICE
- `AccountType`: CASH, BANK
- `NotificationType`: TRANSACTION, APPROVAL, SYSTEM, BROADCAST

## Improvement dari v3

| Model | Field Baru | Alasan |
| ------- | ----------- | -------- |
| Transaction | `accountId` | Transfer antar-akun |
| Transaction | `photoUrl` | Upload bukti transfer |
| Transaction | `orderItems` (JSON) | POS order items |
| Unit | `type` (UnitType) | RETAIL/KPAK/OFFICE |
| Unit | `isRetail` | Filter POS |

## Konfigurasi

- Provider: MySQL 8.0
- Prima versi 5.22.0
- Environment file: `.env.example` siap

## Selanjutnya

@developer (Pak Toni) dapat mulai:

1. Install Prisma client
2. Generate client
3. Setup NextAuth.js CredentialsProvider
4. Buat middleware RBAC

Schema siap untuk implementasi.
