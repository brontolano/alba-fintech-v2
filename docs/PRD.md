# Product Requirements Document (PRD)
# ALBA Finance v2 — Sistem Manajemen Keuangan Multi-Unit

**Dokumen ini** adalah panduan utama untuk product manager, stakeholder, dan tim pengembangan.

## 1. Executive Summary

ALBA Finance v2 adalah sistem manajemen keuangan terpusat untuk pesantren dan organisasi multi-unit. Sistem ini mendukung approval bertingkat, audit log lengkap, dan dashboard real-time.

## 2. Goals & Objectives

### Goals
- Pusatkan manajemen keuangan semua unit di satu sistem
- Otomatisasi alur approval transaksi
- Audit trail lengkap untuk kepatuhan
- Dashboard real-time untuk monitoring

### Objectives
- 50% reduksi waktu penyelesaian approval
- 100% visibilitas transaksi lintas unit
- Audit komprehensif tiap transaksi

## 3. User Personas

| Role | Deskripsi | Permissions |
|------|-----------|-------------|
| **Superadmin** | Admin penuh — manage semua unit & user | Full CRUD semua — create/edit/delete unit, user, akun |
| **Pimpinan** | Executive — overview lintas unit | View semua unit — approve transaksi — laporan eksekutif |
| **Manager** | Unit manager — operasional harian | Manage transaksi unit — input — rekonsiliasi — export |
| **Staff** | Petugas lapangan — input transaksi | Input transaksi — view transaksi sendiri — rekonsiliasi input |

## 4. Features

### 4.1 Multi-Unit Dashboard
- Real-time stats per unit
- Filter by unit
- Export ke PDF/Excel

### 4.2 Role-Based Access Control
- 4-level hierarki role
- Permission matrix per role
- Dynamic role assignment

### 4.3 Approval Workflow
- Auto-trigger approval untuk transaksi besar
- Audit trail lengkap
- Multi-level approval

### 4.4 Manajemen User & Unit
- CRUD user & unit
- Assignment unit ke user
- Aktivasi/non-aktivasi akun

## 5. User Stories

```gherkin
Feature: Multi-Unit Dashboard
  As a Pimpinan
  I want to see real-time stats for all units
  So that I can monitor overall financial health

Feature: Approval Workflow
  As a Pimpinan
  I want to approve large transactions
  So that expenditures over threshold are controlled

Feature: Role-Based Access
  As a Superadmin
  I want to assign roles to users
  So that each role has appropriate permissions
```

## 6. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Waktu approval | ≤ 24 hours | Time from submit to approve |
| Visibilitas transaksi | 100% | All transactions traceable |
| User adoption | ≥ 80% | Active user rate |
| Error rate | ≤ 1% | Validation errors |

## 7. Timeline

| Phase | Duration | Milestones |
|-------|----------|------------|
| Q3 2026 | 3 months | MVP launch |
| Q4 2026 | 3 months | Full feature rollout |
| Q1 2027 | 3 months | Production stabilization |

---
*Generated: August 2026 | Project: alba-fintech-v2 v0.1.0*
*