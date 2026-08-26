# Software Requirements Specification (SRS)
# ALBA Finance v2 — Technical Requirements & Architecture

## 1. Introduction

### 1.1 Purpose
SRS ini mendokumentasikan kebutuhan teknis, arsitektur sistem, dan spesifikasi functional/non-functional untuk sistem ALBA Finance v2.

### 1.2 Scope
Sistem ini adalah aplikasi web berbasis Next.js untuk manajemen keuangan multi-unit dengan approval workflow, audit logging, dan role-based access control.

### 1.3 Definitions
| Term | Definition |
|------|------------|
| Unit | Organisasi atau departemen di dalam pesantren |
| Role | Hak akses pengguna (Superadmin, Pimpinan, Manager, Staff) |
| Transaction | Entri keuangan (INCOME/EXPENSE) |
| Approval | Proses persetujuan transaksi |
| Account | Chart of Accounts (ASSET, LIABILITY, EQUITY, INCOME, EXPENSE) |

## 2. Overall Description

### 2.1 Product Perspective
- **Architecture:** Next.js full-stack (App Router + API Routes)
- **Database:** MySQL via Prisma ORM (v6.19.3)
- **Authentication:** NextAuth.js v4 (Credentials + OAuth)
- **UI Framework:** TailwindCSS + shadcn/ui + lucide-react

### 2.2 Product Functions
1. Multi-unit financial management
2. Role-based access control (4 levels)
3. Transaction approval workflow
4. Audit logging
5. Real-time dashboard

### 2.3 User Characteristics
- **Superadmin**: Full system access — manages all units & users
- **Pimpinan**: Cross-unit oversight — approves transactions
- **Manager**: Unit operations — creates/manages transactions
- **Staff**: Daily transaction input

### 2.4 Constraints
- **OS**: Linux (Hostinger hosting)
- **Node.js**: ≥ 18.x
- **Database**: MySQL 8.0
- **Hosting**: Shared hosting (Hostinger — no npx on server)

## 3. System Architecture

### 3.1 Architecture Diagram
```
┌─────────────────┐      ┌──────────────────────┐
│   Frontend      │      │   Backend            │
│  (Next.js       │◄───► │  (API Routes)        │
│   App Router)   │      │   Prisma ORM         │
└─────────────────┘      └──────────────────────┘
         │                        │
         ▼                        ▼
┌─────────────────┐      ┌──────────────────────┐
│  MySQL DB       │◄─────│  Prisma Client       │
│  (alba_finance) │      │  (v6.19.3)           │
└─────────────────┘      └──────────────────────┘
```

### 3.2 Technology Stack
| Layer | Technology | Version |
|-------|------------|---------|
| **Frontend** | Next.js App Router | 14.2.18 |
| **Language** | TypeScript | 5.x |
| **Styling** | TailwindCSS | 3.4.1 |
| **UI Library** | shadcn/ui + lucide-react | latest |
| **Backend** | Next.js API Routes | 14.2.18 |
| **ORM** | Prisma | 6.19.3 |
| **Database** | MySQL | 8.0 |
| **Auth** | NextAuth.js | 4.24.15 |
| **Validation** | Zod | 3.x |

### 3.3 Data Flow
1. User authentication via NextAuth credential provider
2. Request routed through Next.js API Routes (App Router)
3. API handler validates input with Zod schema
4. Prisma ORM queries MySQL database
5. Response returned in standardized JSON format
6. Client receives response and updates UI reactively

## 4. Database Schema (ERD)

### 4.1 Entity Relationship Diagram
```
Unit (1) ──────── (M) User ──────── (M) Transaction
   │                    │                    │
   │                    │                    │
   │                    └──────────── (M) Approval
   │                    │
   └──────────── (M) Transaction
                    (creator)

User (1) ──────── (M) AuditLog
User (1) ──────── (M) Notification

Account (1) ──────── (M) Transaction (optional)
Account (1) ──────── (1) Parent Account (hierarchical)
```

### 4.2 Model Definitions

#### Unit
```prisma
model Unit {
  id          String        @id @default(cuid())
  name        String        @unique
  code        String        @unique
  description String?
  isActive    Boolean       @default(true)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  transactions Transaction[]
  users       User[]
}
```

#### User
```prisma
model User {
  id                   String         @id @default(cuid())
  email                String         @unique
  name                 String?
  passwordHash         String         @map("password_hash")
  role                 Role           @default(STAFF)
  unitId               String?        @map("unit_id")
  isActive             Boolean        @default(true)
  emailVerified        DateTime?      @map("email_verified")
  image                String?
  createdAt            DateTime       @default(now()) @map("created_at")
  updatedAt            DateTime       @updatedAt @map("updated_at")
  approvals            Approval[]
  auditLogs            AuditLog[]
  notifications        Notification[]
  transactionsApproved Transaction[]  @relation("TransactionApprover")
  transactionsCreated  Transaction[]  @relation("TransactionCreator")
  unit                 Unit?          @relation(fields: [unitId], references: [id])
}
```

#### Transaction
```prisma
model Transaction {
  id           String            @id @default(cuid())
  unitId       String            @map("unit_id")
  type         TransactionType
  amount       Float
  description  String
  status       TransactionStatus @default(DRAFT)
  reference    String?
  createdById  String            @map("created_by_id")
  approvedById String?           @map("approved_by_id")
  approvedAt   DateTime?         @map("approved_at")
  createdAt    DateTime          @default(now()) @map("created_at")
  updatedAt    DateTime          @updatedAt @map("updated_at")
  accountId    String?           @map("account_id")
  approvals    Approval[]
  account      Account?          @relation(fields: [accountId], references: [id])
  approvedBy   User?             @relation("TransactionApprover", fields: [approvedById], references: [id])
  createdBy    User              @relation("TransactionCreator", fields: [createdById], references: [id])
  unit         Unit              @relation(fields: [unitId], references: [id])
}
```

#### Approval
```prisma
model Approval {
  id            String         @id @default(cuid())
  transactionId String         @map("transaction_id")
  approverId    String         @map("approver_id")
  status        ApprovalStatus @default(PENDING)
  comment       String?
  createdAt     DateTime       @default(now()) @map("created_at")
  updatedAt     DateTime       @updatedAt @map("updated_at")
  approver      User           @relation(fields: [approverId], references: [id])
  transaction   Transaction    @relation(fields: [transactionId], references: [id], onDelete: Cascade)
}
```

#### AuditLog
```prisma
model AuditLog {
  id        String   @id @default(cuid())
  userId    String?  @map("user_id")
  action    String
  entity    String
  entityId  String?  @map("entity_id")
  oldData   String?  @map("old_data")
  newData   String?  @map("new_data")
  ipAddress String?  @map("ip_address")
  userAgent String?  @map("user_agent")
  createdAt DateTime @default(now()) @map("created_at")
  user      User?    @relation(fields: [userId], references: [id])
}
```

#### Account (Chart of Accounts)
```prisma
model Account {
  id           String        @id @default(cuid())
  name         String        @unique
  code         String        @unique
  type         AccountType
  description  String?
  parentId     String?       @map("parent_id")
  isActive     Boolean       @default(true)
  createdAt    DateTime      @default(now()) @map("created_at")
  updatedAt    DateTime      @updatedAt @map("updated_at")
  parent       Account?      @relation("AccountParent", fields: [parentId], references: [id])
  children     Account[]     @relation("AccountParent")
  transactions Transaction[]
}
```

#### Notification
```prisma
model Notification {
  id        String           @id @default(cuid())
  userId    String?          @map("user_id")
  title     String
  message   String
  type      NotificationType
  isRead    Boolean          @default(false) @map("is_read")
  createdAt DateTime         @default(now()) @map("created_at")
  updatedAt DateTime         @updatedAt @map("updated_at")
  user      User?            @relation(fields: [userId], references: [id])
}
```

### 4.3 Enum Definitions

| Enum | Values |
|------|--------|
| **Role** | `SUPERADMIN`, `PIMPINAN`, `MANAGER`, `STAFF` |
| **TransactionStatus** | `DRAFT`, `PENDING`, `APPROVED`, `REJECTED` |
| **TransactionType** | `INCOME`, `EXPENSE` |
| **ApprovalStatus** | `PENDING`, `APPROVED`, `REJECTED` |
| **AccountType** | `ASSET`, `LIABILITY`, `EQUITY`, `INCOME`, `EXPENSE` |
| **NotificationType** | `INFO`, `SUCCESS`, `WARNING`, `ERROR` |

## 5. API Specification

### 5.1 Base URL
```
https://alba.brontolano.com/api
```

### 5.2 Authentication
All API endpoints require NextAuth.js session token via `Authorization: Bearer <token>` header (except `/auth/[...nextauth]`).

### 5.3 Endpoints

| Method | Endpoint | Description | Role Required |
|--------|----------|-------------|---------------|
| POST | `/auth/[...nextauth]/credentials` | Login via credentials | Public |
| GET | `/auth/[...nextauth]/providers` | Get OAuth providers | Public |
| GET | `/units` | List all units | All authenticated |
| POST | `/units` | Create new unit | Superadmin |
| GET | `/units/:id` | Get single unit | All authenticated |
| PUT | `/units/:id` | Update unit | Superadmin |
| DELETE | `/units/:id` | Delete unit | Superadmin |
| GET | `/users` | List all users | Superadmin, Pimpinan, Manager |
| POST | `/users` | Create new user | Superadmin |
| GET | `/users/:id` | Get single user | Superadmin, Pimpinan, Manager |
| PUT | `/users/:id` | Update user | Superadmin |
| GET | `/users/permissions` | Get permission matrix | Superadmin, Pimpinan, Manager |
| GET | `/transactions` | List transactions (filterable) | All authenticated |
| POST | `/transactions` | Create transaction | Manager, Staff |
| GET | `/transactions/:id` | Get transaction detail | All authenticated |
| PUT | `/transactions/:id` | Update transaction | Manager, Staff, Pimpinan (status only) |
| DELETE | `/transactions/:id` | Delete transaction | Manager |
| GET | `/approvals` | List approval requests | Superadmin, Pimpinan, Manager |
| POST | `/approvals` | Approve/reject transaction | Superadmin, Pimpinan |
| GET | `/accounts` | List chart of accounts | All authenticated |
| POST | `/accounts` | Create account | Superadmin |
| GET | `/audit-logs` | Get audit trail | Superadmin, Pimpinan |
| GET | `/notifications` | Get user notifications | All authenticated |
| POST | `/notifications/read` | Mark notifications as read | All authenticated |

### 5.4 Response Format (Standardized)
```typescript
// Success Response
{
  "data": any,
  "success": true
}

// Error Response
{
  "error": "Error message",
  "success": false
}
```

## 6. Functional Requirements

### 6.1 Authentication & Authorization
1. **FR-001**: User MUST authenticate before accessing any protected route
2. **FR-002**: Session token MUST be validated on every API request
3. **FR-003**: Role-based access MUST be enforced at API route level
4. **FR-004**: Superadmin MUST have full CRUD access to all entities
5. **FR-005**: Staff MUST only perform transaction input for their assigned unit

### 6.2 Transaction Management
1. **FR-006**: User MUST be able to create draft transactions
2. **FR-007**: Transaction with amount ≥ 10,000,000 MUST trigger approval workflow
3. **FR-008**: Transaction status MUST follow: DRAFT → PENDING → APPROVED/REJECTED
4. **FR-009**: User MUST NOT be able to delete approved transactions
5. **FR-010**: Transaction description MUST be searchable

### 6.3 Approval Workflow
1. **FR-011**: Pimpinan MUST receive approval request for transactions over threshold
2. **FR-012**: Approval MUST create audit log entry
3. **FR-013**: Transaction MUST be rejected if approval is rejected
4. **FR-014**: Multi-level approval MUST route through appropriate approvers
5. **FR-015**: Approver MUST be able to add comments to approvals

### 6.4 Reporting & Dashboard
1. **FR-016**: Dashboard MUST show real-time transaction stats per unit
2. **FR-017**: Export MUST be available in PDF and Excel formats
3. **FR-018**: Audit log MUST be searchable by date range and entity type

## 7. Non-Functional Requirements

### 7.1 Performance
1. **NFR-001**: Dashboard MUST load in < 3 seconds (TTFB)
2. **NFR-002**: Transaction list MUST render 100 items per page (pagination)
3. **NFR-003**: Database queries MUST use indexed columns for filtering

### 7.2 Security
1. **NFR-004**: Passwords MUST be hashed with bcrypt (10 rounds minimum)
2. **NFR-005**: Session MUST expire after 24 hours of inactivity
3. **NFR-006**: CSRF protection MUST be enabled on all state-changing endpoints
4. **NFR-007**: SQL injection MUST be prevented via Prisma ORM (parameterized queries)

### 7.3 Reliability
1. **NFR-008**: Audit log MUST be written for every data-changing operation
2. **NFR-009**: Error messages MUST NOT expose internal system information
3. **NFR-010**: Database connection MUST retry on transient failures

### 7.4 Usability
1. **NFR-011**: Login page MUST have email + password fields only
2. **NFR-012**: Error messages MUST be displayed inline near the problematic field
3. **NFR-013**: Loading states MUST be shown during data fetching

## 8. Deployment Architecture

### 8.1 Local Development
```
Environment: Development (.env.local)
- Port: 3000
- Hot reload: enabled
- Logging: verbose
```

### 8.2 Production (Hostinger)
```
Environment: Production (.env.production)
- Port: 3000 (behind proxy)
- Build: npm run build → .next/ directory
- Static export: public/ directory
- Database: MySQL via Prisma
- No npx access — migrations run locally
```

---
*Generated: August 2026 | Project: alba-fintech-v2 v0.1.0*
