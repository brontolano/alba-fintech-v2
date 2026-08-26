# Business Requirements Document (BRD)
# ALBA Finance v2 — Business Needs & Value

## 1. Executive Summary

### 1.1 Project Title
ALBA Finance v2 — Sistem Manajemen Keuangan Multi-Unit untuk Pesantren

### 1.2 Project Sponsor
Pengelolaan Keuangan Pesantren AL-BA (Brontolano)

### 1.3 Project Manager
Muhammad Hamdan (@brontolano)

### 1.4 Document Version
Version 1.0 — August 2026

### 1.5 Approval Status
✅ Approved by Product Owner

---

## 2. Business Problem Statement

### 2.1 Current State (Alba Finance v1)
- Manual record keeping (Excel/Google Sheets)
- Single-unit financial management
- No approval workflow for large transactions
- No audit trail or reconciliation tracking
- No real-time dashboard or reporting

### 2.2 Business Impact
- **Financial Risk**: No approval workflow → uncontrolled spending
- **Inefficiency**: Manual reconciliation → 3-5 days per period
- **Lack of Transparency**: No real-time visibility into unit performance
- **Compliance Risk**: No audit trail → difficult compliance verification

### 2.3 Proposed Solution (ALBA Finance v2)
A centralized, role-based financial management system that supports:
- Multi-unit management (pesantren with multiple units/kampus/pesantren cabang)
- Automated approval workflows for large transactions
- Comprehensive audit logging
- Real-time dashboard & automated reporting
- Role-based access control (4-level hierarchy)

---

## 3. Business Goals & Objectives

### 3.1 Strategic Goals
| Goal | Description |
|------|-------------|
| **Centralize Financial Operations** | Consolidate all financial activities across units into one platform |
| **Automate Approval Workflows** | Reduce manual oversight for transaction approvals |
| **Improve Transparency** | Provide real-time financial visibility to decision-makers |
| **Ensure Compliance** | Maintain complete audit trail for all financial operations |

### 3.2 Measurable Objectives
| Objective | Target | Timeline |
|-----------|--------|----------|
| Reduce approval time | ≤ 24 hours | Q3 2026 |
| Increase transaction visibility | 100% traceable | Q3 2026 |
| Reduce reconciliation time | ≤ 2 hours | Q4 2026 |
| User adoption rate | ≥ 85% | Q1 2027 |
| System uptime | ≥ 99.5% | Ongoing |

---

## 4. Business Requirements

### 4.1 Functional Business Requirements

| BR ID | Business Requirement | Priority | Source |
|-------|---------------------|----------|--------|
| **BR-001** | Sistem harus mendukung banyak unit yang terhubung ke satu akun induk | High | Management |
| **BR-002** | Sistem harus otomatis trigger approval untuk transaksi di atas ambang batas | High | Finance Team |
| **BR-003** | Sistem harus menyediakan audit trail lengkap untuk kepatuhan | High | Compliance |
| **BR-004** | Sistem harus menampilkan dashboard real-time per unit | High | Leadership |
| **BR-005** | Sistem harus mendukung export laporan dalam format PDF dan Excel | Medium | Accounting |
| **BR-006** | Sistema harus memiliki role-based access control (4 levels) | High | IT Security |
| **BR-007** | Sistem harus mendukung rekonsiliasi transaksi | Medium | Accounting |
| **BR-008** | Sistem harus menyimpan histori perubahan data (old/new) | High | Compliance |

### 4.2 Non-Functional Business Requirements

| BR ID | Requirement | Target |
|-------|-------------|--------|
| **BR-009** | System availability | 99.5% uptime |
| **BR-010** | Response time | < 3 seconds for dashboard load |
| **BR-011** | Data encryption | AES-256 at rest, TLS 1.3 in transit |
| **BR-012** | Backup frequency | Daily automated backups |
| **BR-013** | User capacity | Support 100+ concurrent users |
| **BR-014** | Mobile access | 80% of functionality available on mobile |

---

## 5. Stakeholder Analysis

### 5.1 Stakeholder Matrix

| Stakeholder | Role | Interest | Influence | Communication Plan |
|-------------|------|----------|-----------|-------------------|
| **Pengelola Pesantren** | Superadmin/User | High | High | Monthly review meeting |
| **Bendahara Pusat** | Pimpinan | High | High | Weekly status update |
| **Bendahara Unit** | Manager | High | Medium | Daily standup via WhatsApp |
| **Staff Keuangan** | Staff | Medium | Low | Training session |
| **IT Administrator** | Technical admin | High | High | Daily sync |
| **Auditor Eksternal** | Compliance | High | Medium | Quarterly access |

### 5.2 Stakeholder Needs
| Stakeholder | Key Needs |
|-------------|-----------|
| **Pengelola Pesantren** | Full system visibility, user access control |
| **Bendahara Pusat** | Cross-unit overview, approval authority |
| **Bendahara Unit** | Unit-level transaction management, reporting |
| **Staff Keuangan** | Simple transaction input, clear error feedback |

---

## 6. Business Process Analysis

### 6.1 Current Process (Before — Manual)
```
Staff → Excel → Email → Manager Review → Manual Approval → Excel Archive
```
- **Time**: 2-7 days (depending on approvers)
- **Risk**: Data loss, no audit trail, version control issues
- **Cost**: High manual effort, error-prone

### 6.2 Future Process (After — ALBA Finance v2)
```
Staff → Web App (Draft) → Auto Approval Routing → Pimpinan Approval → System Archive + Audit Log
```
- **Time**: ≤ 24 hours
- **Risk**: Automated validation, full audit trail
- **Cost**: Reduced manual effort, accurate reporting

### 6.3 Process Mapping

#### 6.3.1 Transaction Processing

| Step | Old Process | New Process | Improvement |
|------|-------------|-------------|-------------|
| 1 | Write in Excel | Input via web form | Real-time validation |
| 2 | Email to manager | Auto routing to approver | No email delay |
| 3 | Manual approval | Click approve in system | Audit trail |
| 4 | Print & archive | Digital archive | Searchable, backed up |
| 5 | Manual reconciliation | Auto-match + manual override | Faster rekonsiliasi |

---

## 7. Impact Analysis

### 7.1 Business Impact
| Area | Current State | Target State | Benefit |
|------|---------------|--------------|---------|
| Approval Speed | 2-7 days | ≤ 24 hours | **67%+ faster** |
| Data Accuracy | Manual entry error | System validation | **0% error rate** |
| Reporting | Manual compilation | Automated dashboard | **Real-time visibility** |
| Compliance | Informal audit trail | System audit log | **Full compliance** |
| Reconciliation | 3-5 days | ≤ 2 hours | **85% time saving** |

### 7.2 Financial Impact

| Category | Description | Amount (IDR) | Period |
|----------|-------------|--------------|--------|
| **Cost Savings** | Reduced manual labor (accounting) | 8,000,000 | Monthly |
| **Cost Savings** | Faster approval → better cash flow | 10,000,000 | Monthly |
| **Cost Savings** | Eliminate paper/printing | 2,000,000 | Monthly |
| **Investment** | Software licensing/maintenance | 0 | (Open source) |
| **Investment** | Initial setup & training | 30,000,000 | One-time |
| **ROI** | **Net monthly benefit** | **15,000,000** | **Starting Month 3** |

### 7.3 Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **User resistance** | Medium | High | Comprehensive training |
| **Data migration errors** | Low | High | Thorough testing phase |
| **System downtime** | Low | High | Automated backups |
| **Security breach** | Low | Critical | Role-based access + encryption |
| **Approval delays** | Low | Medium | Auto-escalation rules |

---

## 8. Implementation Plan

### 8.1 Phases

| Phase | Duration | Goal | Success Criteria |
|-------|----------|------|------------------|
| **Phase 1 (MVP)** | Q3 2026 | Core transaction management | All roles can create/approve transactions |
| **Phase 2 (Reporting)** | Q4 2026 | Advanced reporting & dashboard | Laporan bisa di-export (PDF/Excel) |
| **Phase 3 (Compliance)** | Q1 2027 | Audit trail & advanced features | Full audit compliance |

### 8.2 Resource Requirements

| Resource | Quantity | Notes |
|----------|----------|-------|
| **Developer** | 1 | Muhammad Hamdan |
| **UI/UX Designer** | 1 | (optional) |
| **Tester** | 1 | Internal |
| **IT Support** | 1 | Server maintenance |
| **Training** | 2 sessions | For Staff & Manager |

### 8.3 Success Metrics (KPI)
| KPI | Current | Target | Measurement |
|-----|---------|--------|-------------|
| Average approval time | 5 days | ≤ 24 hours | System timer |
| Data accuracy | 80% | 99%+ | Validation errors |
| User adoption | 30% | ≥ 85% | Active users/month |
| Report generation time | 2+ hours | ≤ 5 minutes | Time to export |
| Reconciliation time | 3-5 days | ≤ 2 hours | Manual vs system |

---

## 9. Constraints & Assumptions

### 9.1 Constraints
- Budget: Limited (using open-source stack)
- Hosting: Shared hosting (Hostinger)
- Timeline: 3-month MVP delivery
- Team: Single developer (Muhammad Hamdan)
- No npx access on server

### 9.2 Assumptions
- Existing database (MySQL) on Hostinger server
- Users have basic computer literacy
- Internet access available
- Google OAuth credentials available
- Management support for role-based access

---
*Generated: August 2026 | Project: ALBA Finance v2 | Document Owner: Muhammad Hamdan*
