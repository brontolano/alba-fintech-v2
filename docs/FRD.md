# Functional Requirements Document (FRD)
# ALBA Finance v2 — Detailed Functional Specifications

## 1. Introduction

### 1.1 Purpose
FRD ini berisi spesifikasi fungsional detail untuk setiap modul sistem ALBA Finance v2. Ini adalah panduan implementasi bagi developer dan tester.

### 1.2 Scope Reference
- **PRD**: Product overview & user personas
- **SRS**: Technical architecture & database schema
- **URD**: User workflows & use cases
- **BRD**: Business goals & financial impact
- **FRD (this)**: Detailed functional specifications per module

### 1.3 Definitions
(See SRS Section 1.3)

---

## 2. Functional Modules

### 2.1 Modul Authentication & Authorization

#### 2.1.1 Login
- **Input**: Email, Password
- **Validation**:
  - Email format (Zod email schema)
  - Password min 8 chars (Zod string min(8))
- **Logic**:
  1. Validate input schema
  2. Query user by email via Prisma
  3. Compare passwordHash with bcryptjs compare()
  4. If valid → create NextAuth session
  5. If invalid → return 401 error
- **Response (Success)**: `{ success: true, user: { id, email, name, role } }`
- **Response (Error)**: `{ error: "Invalid email or password", success: false }`
- **Endpoint**: `POST /api/auth/callback/credentials`

#### 2.1.2 Session Management
- **Logic**:
  - NextAuth.js session callback
  - JWT token with user roles
  - Session expires after 24h (idle timeout)
- **Protected Route Logic**:
  ```typescript
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  ```
- **Role Check Middleware**:
  - Superadmin: all access
  - Pimpinan: cross-unit read + approve
  - Manager: unit-level CRUD
  - Staff: unit transaction input only

### 2.2 Modul Unit Management

#### 2.2.1 List Units (GET /api/units)
- **Input**: Optional filters (isActive, search)
- **Logic**:
  1. Check user role (Superadmin/Pimpinan/Manager/Staff)
  2. Query all units via Prisma
  3. If not Superadmin → filter by user's units (many-to-many)
- **Response**: 
  ```json
  {
    "data": [{ "id": "...", "name": "...", "code": "...", "isActive": true }],
    "success": true
  }
  ```
- **Role Access**: All authenticated users (Pimpinan/Manager melihat unit punya akses)

#### 2.2.2 Create Unit (POST /api/units)
- **Input**: `{ name: string, code: string, description?: string }`
- **Validation (Zod)**:
  ```typescript
  const createUnitSchema = z.object({
    name: z.string().min(3),
    code: z.string().min(2).max(10),
    description: z.string().optional()
  });
  ```
- **Logic**:
  1. Validate role = SUPERADMIN
  2. Validate Zod schema
  3. Check duplicate name/code
  4. Create via Prisma
- **Response (Success)**: `{ data: unit, success: true }`
- **Response (Error)**: `{ error: "Name already exists", success: false }`
- **Role Access**: SUPERADMIN only

#### 2.2.3 Update Unit (PUT /api/units/:id)
- **Input**: `{ name?, code?, description?, isActive? }`
- **Logic**:
  1. Validate role = SUPERADMIN
  2. Check unit exists
  3. Validate Zod schema
  4. Update via Prisma
  5. Log audit trail
- **Role Access**: SUPERADMIN only

#### 2.2.4 Delete Unit (DELETE /api/units/:id)
- **Input**: None (id from route params)
- **Logic**:
  1. Validate role = SUPERADMIN
  2. Check unit exists
  3. Check unit has no active transactions/approvals
  4. Soft delete (set isActive = false) OR hard delete
  5. Log audit trail
- **Response (Error)**: `{ error: "Cannot delete unit with active transactions", success: false }`
- **Role Access**: SUPERADMIN only

### 2.3 Modul User Management

#### 2.3.1 List Users (GET /api/users)
- **Input**: Filters (role, unitId, isActive, search)
- **Logic**:
  1. Check role (SUPERADMIN/PIMPINAN/MANAGER)
  2. Query users with filter
  3. If PIMPINAN → return users in same unit
  4. If MANAGER → return users in assigned unit
- **Response**: `{ data: [users], success: true }`

#### 2.3.2 Create User (POST /api/users)
- **Input**: `{ email, name, password, role, unitId }`
- **Validation (Zod)**:
  ```typescript
  const createUserSchema = z.object({
    email: z.string().email(),
    name: z.string().min(2),
    password: z.string().min(8),
    role: z.enum(["SUPERADMIN", "PIMPINAN", "MANAGER", "STAFF"]),
    unitId: z.string().optional()
  });
  ```
- **Logic**:
  1. Validate role = SUPERADMIN
  2. Hash password (bcryptjs, 10 rounds)
  3. Create user via Prisma
  4. Log audit trail
- **Role Access**: SUPERADMIN only

#### 2.3.3 Update User (PUT /api/users/:id)
- **Input**: `{ name?, role?, unitId?, isActive?, password? }`
- **Logic**:
  1. Validate role = SUPERADMIN
  2. If password provided → rehash
  3. Update user via Prisma
- **Role Access**: SUPERADMIN only

#### 2.3.4 Get Permissions (GET /api/users/permissions)
- **Output**:
  ```json
  {
    "roles": ["SUPERADMIN", "PIMPINAN", "MANAGER", "STAFF"],
    "permissions": {
      "SUPERADMIN": ["units.*", "users.*", "transactions.*", "approvals.*"],
      "PIMPINAN": ["transactions.read.*", "approvals.*", "reports.export"],
      "MANAGER": ["transactions.*", "reports.unit"],
      "STAFF": ["transactions.create", "transactions.read.own"]
    }
  }
  ```

### 2.4 Modul Transaction Management

#### 2.4.1 List Transactions (GET /api/transactions)
- **Input**: Query params (unitId, type, status, dateFrom, dateTo, search, page, limit)
- **Logic**:
  1. Check role-based access
  2. Build Prisma query with filters
  3. Apply pagination (default 20 per page)
  4. Include createdBy, approvedBy, account, unit
- **Pagination Response**:
  ```json
  {
    "data": [...],
    "pagination": { "page": 1, "limit": 20, "total": 150, "totalPages": 8 },
    "success": true
  }
  ```
- **Role Access Rules**:
  - SUPERADMIN/PIMPINAN: all transactions
  - MANAGER: only unit's transactions
  - STAFF: only own transactions

#### 2.4.2 Create Transaction (POST /api/transactions)
- **Input**: `{ unitId, type, amount, description, reference?, accountId?, createdById }`
- **Validation (Zod)**:
  ```typescript
  const createTransactionSchema = z.object({
    unitId: z.string(),
    type: z.enum(["INCOME", "EXPENSE"]),
    amount: z.number().positive(),
    description: z.string().min(3),
    reference: z.string().optional(),
    accountId: z.string().optional()
  });
  ```
- **Logic**:
  1. Validate schema
  2. Create transaction with status = DRAFT
  3. Auto-set createdById = session.user.id
  4. Log audit trail
- **Approval Trigger Logic**:
  ```typescript
  // If amount >= 10,000,000 OR (type === EXPENSE && amount >= 1,000,000)
  if (amount >= 10000000 || (type === "EXPENSE" && amount >= 1000000)) {
    status = "PENDING"; // Needs approval
    // Trigger approval workflow
  }
  ```
- **Role Access**: MANAGER, STAFF

#### 2.4.3 Update Transaction (PUT /api/transactions/:id)
- **Input**: `{ description?, amount?, accountId?, status?, reference? }`
- **Logic**:
  1. Validate role (MANAGER: full, STAFF: own only, PIMPINAN: status only)
  2. Check transaction status (cannot edit APPROVED)
  3. Update via Prisma
  4. Log audit trail with old/new data
- **Status Transition Rules**:
  | Current | Allowed Next | Who |
  |---------|-------------|-----|
  | DRAFT | PENDING | Creator |
  | DRAFT | APPROVED | (if auto-approved small) |
  | PENDING | APPROVED | Approver |
  | PENDING | REJECTED | Approver |
  | APPROVED/REJECTED | (locked) | No one |
- **Role Access**:
  - Manager: full update
  - Staff: own transactions only
  - Pimpinan: status update only (approve/reject)

#### 2.4.4 Delete Transaction (DELETE /api/transactions/:id)
- **Logic**:
  1. Check transaction status (only DRAFT allowed)
  2. Check role (Manager: own, Superadmin: any)
  3. Hard delete from database
  4. Log audit trail
- **Role Access**: MANAGER, SUPERADMIN (own unit)

#### 2.4.5 Submit for Approval (POST /api/transactions/:id/submit)
- **Logic**:
  1. Check status = DRAFT
  2. Validate amount vs threshold
  3. Set status = PENDING
  4. Trigger approval notification to Pimpinan
- **Response**: `{ data: transaction, success: true }`

### 2.5 Modul Approval Management

#### 2.5.1 List Approvals (GET /api/approvals)
- **Input**: Filters (status, approverId, transactionId)
- **Logic**:
  1. Check role (all roles can see, but filter by ownership)
  2. SUPERADMIN/PIMPINAN: all approvals
  3. MANAGER/Staff: own approvals
- **Response**: `{ data: [approvals], success: true }`

#### 2.5.2 Approve Transaction (POST /api/approvals)
- **Input**: `{ transactionId, approverId, status, comment? }`
- **Validation (Zod)**:
  ```typescript
  const approveSchema = z.object({
    transactionId: z.string(),
    status: z.enum(["APPROVED", "REJECTED"]),
    comment: z.string().optional()
  });
  ```
- **Logic**:
  1. Validate role (SUPERADMIN/PIMPINAN)
  2. Check transaction is PENDING
  3. Create Approval record
  4. Update transaction status
  5. If APPROVED → set approvedById, approvedAt
  6. Send notification to transaction creator
  7. Log audit trail
- **Role Access**: SUPERADMIN, PIMPINAN

#### 2.5.3 Bulk Approval
- **Input**: `[{ transactionId, status, comment }]`
- **Logic**:
  - Process array of approvals
  - Return success/failure per item

### 2.6 Modul Buku Besar (Chart of Accounts)

#### 2.6.1 List Accounts (GET /api/accounts)
- **Logic**:
  - Return hierarchical tree (parent/children)
  - Filter by isActive
  - Include transaction count
- **Response**:
  ```json
  {
    "data": [{
      "id": "...",
      "name": "...",
      "code": "1-100-001",
      "type": "ASSET",
      "parentId": "...",
      "children": [...],
      "isActive": true
    }],
    "success": true
  }
  ```

#### 2.6.2 Create Account (POST /api/accounts)
- **Input**: `{ name, code, type, parentId?, description? }`
- **Validation (Zod)**:
  ```typescript
  const createAccountSchema = z.object({
    name: z.string().min(3),
    code: z.string().min(2),
    type: z.enum(["ASSET","LIABILITY","EQUITY","INCOME","EXPENSE"]),
    parentId: z.string().optional(),
    description: z.string().optional()
  });
  ```
- **Logic**:
  - Validate role = SUPERADMIN
  - Validate unique code
  - Create account
- **Role Access**: SUPERADMIN only

### 2.7 Modul Audit Log

#### 2.7.1 Get Audit Logs (GET /api/audit-logs)
- **Input**: Filters (entity, entityId, userId, dateFrom, dateTo)
- **Logic**:
  - Query AuditLog table
  - Include user details
  - Paginate results
- **Response**:
  ```json
  {
    "data": [{
      "id": "...",
      "userId": "...",
      "action": "CREATE",
      "entity": "Transaction",
      "entityId": "...",
      "oldData": null,
      "newData": "{amount: 5000000}",
      "ipAddress": "127.0.0.1",
      "createdAt": "2026-08-25T10:00:00Z"
    }],
    "success": true
  }
  ```

### 2.8 Modul Notification

#### 2.8.1 Get Notifications (GET /api/notifications)
- **Logic**:
  - Filter by current user
  - Order by createdAt desc
  - Include unread count
- **Response**:
  ```json
  {
    "data": [...],
    "unreadCount": 5,
    "success": true
  }
  ```

#### 2.8.2 Mark as Read (POST /api/notifications/read)
- **Input**: `{ notificationIds?: [string], markAll?: boolean }`
- **Logic**:
  - Update isRead = true
  - Support bulk operation

### 2.9 Modul Rekonsiliasi

#### 2.9.1 List Pending Reconciliation (GET /api/reconciliation?status=pending)
- **Input**: Query params (unitId, status, dateRange, page)
- **Logic**:
  1. Get transactions with status = APPROVED (not yet reconciled)
  2. Filter by unit + role access
  3. Paginate (default 20)
- **Response**:
  ```json
  {
    "data": [{
      "id": "...",
      "unitName": "Unit A",
      "amount": 5000000,
      "description": "...",
      "accountName": "KAS DI TUKANG",
      "createdAt": "2026-08-25T10:00:00Z"
    }],
    "pagination": {...},
    "success": true
  }
  ```

#### 2.9.2 Reconcile Transaction (POST /api/reconciliation/:transactionId)
- **Input**: `{ method: "manual|auto_match", notes?: string, confirmedAmount: number, reconcileDate: date }`
- **Logic**:
  1. Validate role = MANAGER
  2. Check transaction is APPROVED
  3. Create reconciliation record
  4. Update transaction status → RECONCILED
  5. Log audit trail
- **Validation**:
  - Transaction must be APPROVED
  - confirmedAmount must match original amount
  - Only Manager can reconcile

### 2.10 Modul Export

#### 2.10.1 Generate PDF Report (GET /api/reports?type=transactions&format=pdf)
- **Input**: Query params (type, fromDate, toDate, unitId, format=pdf|excel)
- **Logic**:
  1. Generate report data (filtered by params)
  2. Format:
     - PDF: using `pdfmake` or `puppeteer`
     - Excel: using `xlsx` library
  3. Stream response
- **Report Types**:
  - `transactions` — Daftar transaksi per periode
  - `trial-balance` — Trial Balance per unit
  - `buku-besar` — Buku Besar per akun
  - `reconciliation` — Laporan rekonsiliasi
- **Headers**:
  - `Content-Disposition: attachment; filename="report.pdf"`
  - `Content-Type: application/pdf` (or `application/vnd.openxmlformats...`)

---

## 3. Cross-Module Workflows

### 3.1 Transaction Lifecycle
```
DRAFT → [Submit] → PENDING → [Approve Pimpinan] → APPROVED → [Reconcile Manager] → RECONCILED
                               ↓
                           [Reject Pimpinan] → REJECTED
```

### 3.2 Approval Routing Logic
```typescript
// Threshold logic:
if (transaction.type === "INCOME") {
  if (transaction.amount >= 10000000) {
    requireApproval = true;  // Need Pimpinan approval
  }
} else if (transaction.type === "EXPENSE") {
  if (transaction.amount >= 1000000) {
    requireApproval = true;  // Expense > 1M needs approval
  }
}
```

### 3.3 Audit Trail Rules
1. **CREATE** operation → log oldData=null, newData=JSON.stringify(payload)
2. **UPDATE** operation → log oldData=JSON.stringify(before), newData=JSON.stringify(after)
3. **DELETE** operation → log oldData=JSON.stringify(item), newData=null
4. **APPROVE** operation → log action="APPROVE", entity="Transaction"

---
*Generated: August 2026 | Project: alba-fintech-v2 v0.1.0*
