# Alba Fintech — API Endpoint Analysis

> **Source**: `C:/AI/alba-fintech-v2` (Next.js 14 App Router + Prisma 6 + NextAuth 4 + MySQL 8)
> **Base URL**: `https://alba.brontolano.com/api`
> **Auth**: NextAuth.js v4 — JWT session token via `next-auth.session-token` cookie OR `Authorization: Bearer <token>` for mobile
> **Generated**: 2026-08-29

---

## Role Hierarchy

| Role | Level | Permissions |
|------|-------|-------------|
| **SUPERADMIN** | 0 | Full CRUD across all units, users, accounts, lembaga |
| **PIMPINAN** | 1 | Cross-unit view, approve/reject transactions, export reports |
| **MANAGER** | 2 | Unit-scoped CRUD, unit-level reconciliation, view own unit's data |
| **STAFF** | 3 | Create own transactions, view own transactions, view unit data |

---

## Authentication Endpoints

### `POST /api/mobile/auth/login`
Mobile-specific login endpoint using Credentials Provider (bypasses web session redirect).

| Property | Detail |
|----------|--------|
| **Description** | Authenticates user via email/password, returns JWT access token |
| **Auth Required** | ❌ Public |
| **Request Body** | `{ email: string, password: string }` |
| **Validation** | Zod: `email` (min 1), `password` (min 1) |
| **Success Response** | `200 OK` |
| **Response Schema** | ```json { "accessToken": "<JWT>", "user": { "id", "name", "email", "role", "unitId" } } ``` |
| **Error Responses** | `400` — Validation failed (`{ error, details }`) |
| | `401` — Invalid email/password (`{ error: "Email atau password salah" }`) |
| | `500` — Server config error (`{ error: "Server configuration error" }`) |
| **Token TTL** | 30 days (`maxAge: 30 * 24 * 60 * 60`) |
| **Cookie Usage** | Client should store `accessToken` and use as `next-auth.session-token` cookie OR `Authorization: Bearer` header |

### `POST /api/mobile/auth/logout`
Clears the NextAuth session token cookie.

| Property | Detail |
|----------|--------|
| **Description** | Clears `next-auth.session-token` cookie |
| **Auth Required** | ❌ Public |
| **Request Body** | None |
| **Success Response** | `200 OK` — `{ message: "Logged out successfully" }` |
| **Cookie Cleared** | `next-auth.session-token` → empty, `maxAge: 0` |

### `GET|POST /api/auth/[...nextauth]`
Standard NextAuth.js handler (delegates to `authConfig`).

| Property | Detail |
|----------|--------|
| **Description** | NextAuth.js catch-all route handler |
| **Routes** | `/api/auth/signin`, `/api/auth/callback/credentials`, `/api/auth/session`, `/api/auth/providers`, etc. |
| **Auth Required** | ❌ Public (for signin/session/providers) |

---

## Dashboard Stats Endpoints

> Note: The Next.js dashboard pages (`src/app/dashboard/*/page.tsx`) compute stats server-side via Prisma, not via dedicated API endpoints. However, the closest API equivalents serve similar data.

### Dashboard Data Sources (via existing APIs):

| Dashboard | Data Source | Key Stats |
|-----------|-------------|-----------|
| **SUPERADMIN** | `GET /api/audit-logs` + Prisma | Total users, total units, total transactions, recent activity feed |
| **PIMPINAN** | `GET /api/reconciliation` + `GET /api/reports/export` | Pending approvals, total transactions, approved count, income/expense trends (30d) |
| **MANAGER** | `GET /api/transactions` + `GET /api/reconciliation` | Unit transactions, staff count, pending approvals |
| **STAFF** | `GET /api/transactions` | My transactions, my approved, my pending |

---

## Transaction Endpoints

### `GET /api/transactions`
List transactions (role-based visibility).

| Property | Detail |
|----------|--------|
| **Description** | Returns transactions visible to the authenticated user's role |
| **Auth Required** | ✅ All authenticated roles (`getServerSession`) |
| **HTTP Method** | `GET` |
| **Query Parameters** | None (filtering is role-based, not query-param based in this implementation) |
| **Role Access** | - **SUPERADMIN / PIMPINAN**: All transactions (no filter) |
| | - **MANAGER**: Transactions where `unitId = session.user.unitId` |
| | - **STAFF**: Transactions where `createdById = session.user.id` |
| **Success Response** | `200 OK` |
| **Response Schema** | ```json { "data": [TransactionWithIncludes], "meta": { "count": number } } ``` |
| **TransactionWithIncludes fields** | `id`, `unitId`, `type` (INCOME/EXPENSE), `amount` (float), `description`, `status` (DRAFT/PENDING/APPROVED/REJECTED), `reference`, `createdById`, `approvedById`, `approvedAt`, `createdAt`, `updatedAt`, `accountId`, `photoUrl`, `unit` {name, code}, `createdBy` {name, email, role}, `approvedBy` {name, email}, `account` {name, code} |
| **Error Responses** | `401` — Unauthorized (`{ error: "Unauthorized" }`) |
| | `500` — Internal server error (`{ error: "Internal server error" }`) |

### `POST /api/transactions`
Create a new transaction (status: PENDING → triggers approval workflow).

| Property | Detail |
|----------|--------|
| **Description** | Creates transaction with initial status `PENDING` |
| **Auth Required** | ✅ All authenticated roles |
| **HTTP Method** | `POST` |
| **Content-Type** | `application/json` or `multipart/form-data` |
| **JSON Body Schema** (Zod-validated) | ```typescript { unitId: string (required), type: "INCOME" \| "EXPENSE" (required), amount: number > 0 (required), description: string 3-500 chars (required), reference?: string, accountId?: string, photoUrl?: string } ``` |
| **FormData Fields** | `type`, `amount`, `description`, `reference?`, `unitId?` (for SUPERADMIN/PIMPINAN), `photo` (File — saved to `/uploads/transactions/<timestamp>_<filename>`) |
| **RBAC Unit Logic** | - **STAFF/MANAGER**: `unitId` auto-set to `session.user.unitId` (body `unitId` ignored) |
| | - **SUPERADMIN/PIMPINAN**: `unitId` from request body |
| **Success Response** | `201 Created` |
| **Response Schema** | ```json { "data": Transaction, "message": "Transaksi berhasil dibuat (status: pending approval)" } ``` |
| **Created Transaction fields** | `id`, `unitId`, `type`, `amount`, `description`, `status`, `reference`, `photoUrl`, `accountId`, `createdAt` |
| **Error Responses** | `400` — Validation failed / invalid unit or account / missing fields |
| | `401` — Unauthorized |
| | `404` — Unit not found |
| | `500` — Internal server error |

### `GET /api/transactions/{id}`
Get a single transaction by ID.

| Property | Detail |
|----------|--------|
| **Description** | Fetches full transaction detail with includes |
| **Auth Required** | ✅ All authenticated roles |
| **HTTP Method** | `GET` |
| **Path Parameters** | `id: string` — Transaction ID (from URL path segments) |
| **Success Response** | `200 OK` |
| **Response Schema** | ```json { "data": { "id", "unitId", "type", "amount", "description", "status", "reference", "accountId", "createdById", "approvedById", "approvedAt", "createdAt", "updatedAt", "unit": {"name","code"}, "createdBy": {"name","email","role","unit":{"name"}}, "approvedBy": {"name","email","role"}, "account": {"name","code"}, "photoUrl" } } ``` |
| **RBAC Access** | - **SUPERADMIN / PIMPINAN**: Any transaction |
| | - **MANAGER**: Only if `transaction.unitId === user.unitId` |
| | - **STAFF**: Only if `transaction.createdById === user.id` |
| **Error Responses** | `400` — Transaction ID required |
| | `401` — Unauthorized |
| | `403` — Forbidden |
| | `404` — Transaction not found |
| | `500` — Internal server error |

### `PATCH /api/transactions/{id}`
Update a transaction (only if DRAFT or PENDING).

| Property | Detail |
|----------|--------|
| **Description** | Updates editable fields of a transaction |
| **Auth Required** | ✅ All authenticated roles |
| **HTTP Method** | `PATCH` |
| **Path Parameters** | `id: string` |
| **JSON Body Schema** (Zod-validated) | ```typescript { type?: "INCOME" \| "EXPENSE", amount?: number > 0, description?: string 3-500, reference?: string, status?: "DRAFT" \| "PENDING" \| "APPROVED" \| "REJECTED", accountId?: string \| null, photoUrl?: string \| null } ``` |
| **RBAC Access** | Same as GET (role-based ownership) |
| **Status Lock** | If `existing.status === APPROVED` or `REJECTED` → `400` error "Transaksi yang sudah disetujikan/ditolak tidak bisa diubah" |
| **Success Response** | `200 OK` |
| **Response Schema** | ```json { "data": { id, unitId, type, amount, description, status, reference, accountId, photoUrl, updatedAt }, "message": "Transaksi berhasil diupdate" } ``` |
| **Error Responses** | `400` — Validation failed / status locked |
| | `401`, `403`, `404` — as above |
| | `500` — Internal server error |

### `DELETE /api/transactions/{id}`
Delete a transaction (only DRAFT or PENDING).

| Property | Detail |
|----------|--------|
| **Description** | Hard-deletes a transaction |
| **Auth Required** | ✅ All authenticated roles |
| **HTTP Method** | `DELETE` |
| **Path Parameters** | `id: string` |
| **RBAC Access** | - **SUPERADMIN / PIMPINAN**: Any transaction |
| | - **MANAGER**: Own unit transactions |
| | - **STAFF**: Only own transactions (`createdById === userId`) |
| **Status Lock** | If `APPROVED` or `REJECTED` → `400` error "Hanya transaksi dengan status DRAFT atau PENDING yang bisa dihapus" |
| **Success Response** | `200 OK` |
| **Response Schema** | ```json { "message": "Transaksi berhasil dihapus" } ``` |
| **Error Responses** | `400`, `401`, `403`, `404`, `500` |

---

## Approval Workflow Endpoints

### `GET /api/approvals`
List approval requests (role-filtered).

| Property | Detail |
|----------|--------|
| **Description** | Lists approval records with full transaction and approver details |
| **Auth Required** | ✅ All authenticated roles |
| **HTTP Method** | `GET` |
| **Query Parameters** | None |
| **Role Filtering** | - **SUPERADMIN / PIMPINAN**: All approvals |
| | - **MANAGER**: Approvals where transaction's unit includes the manager's user |
| | - **STAFF**: Approvals where `transaction.createdById === session.user.id` |
| **Success Response** | `200 OK` |
| **Response Schema** | ```json { "data": [Approval], "meta": { "count": number } } ``` |
| **Approval fields** | `id`, `transactionId`, `approverId`, `status`, `comment`, `createdAt`, `updatedAt`, `transaction` { `id`, `type`, `amount`, `description`, `status`, `unit` {name, code}, `createdBy` {name, email} }, `approver` {name, email, role} |
| **Error Responses** | `401` — Unauthorized |
| | `500` — Internal server error |

### `POST /api/approvals`
Approve or reject a pending transaction.

| Property | Detail |
|----------|--------|
| **Description** | Approves or rejects a PENDING transaction, updates transaction status atomically |
| **Auth Required** | ✅ All authenticated roles (but only approvers have meaningful access) |
| **HTTP Method** | `POST` |
| **JSON Body Schema** (Zod-validated) | ```typescript { transactionId: string (required), action: "approve" \| "reject" (required), comment?: string (max 500) } ``` |
| **RBAC Logic** | - **STAFF**: Can call but transaction lookup applies (no explicit guard — relies on STAFF seeing own approver... actually no guard prevents it, but PENDING check applies) |
| | - **MANAGER**: Must check `transaction.unitId === user.unitId` (403 if not) |
| | - **SUPERADMIN / PIMPINAN**: Full access |
| **Pre-conditions** | Transaction must have `status === 'PENDING'` → else `400` |
| | Transaction must not have been already processed (existing APPROVED/REJECTED approval record) → else `400` |
| **Atomic Operations** | 1. Update `Transaction.status` → APPROVED/REJECTED |
| | 2. Set `approvedById`, `approvedAt` |
| | 3. Create `Approval` record |
| | 4. Create `AuditLog` entry |
| **Success Response** | `200 OK` |
| **Response Schema** | ```json { "data": { id, type, amount, description, status, unit: {name, code}, createdBy: {name, email} }, "message": "Transaksi berhasil disetujui" \| "Transaksi berhasil ditolak" } ``` |
| **Error Responses** | `400` — Validation failed / not PENDING / already processed |
| | `401` — Unauthorized |
| | `403` — "Anda hanya dapat menyetujui transaksi unit Anda" (Manager cross-unit) |
| | `404` — Transaction not found |
| | `500` — Internal server error |

---

## Notification Endpoints

### `GET /api/notifications`
Fetch user notifications (paginated by limit).

| Property | Detail |
|----------|--------|
| **Description** | Returns notifications for the authenticated user |
| **Auth Required** | ✅ All authenticated roles |
| **HTTP Method** | `GET` |
| **Query Parameters** | `limit`? number (default: 20) — max items to return |
| **Success Response** | `200 OK` |
| **Response Schema** | ```json { "data": [Notification] } ``` |
| **Notification fields** | `id`, `userId`, `title`, `message`, `type` (INFO/SUCCESS/WARNING/ERROR), `isRead`, `createdAt`, `updatedAt` |
| **Error Responses** | `401` — Unauthorized |
| | `500` — Internal server error |

### `POST /api/notifications`
Create a notification (for self or another user).

| Property | Detail |
|----------|--------|
| **Description** | Creates a new notification record + audit log |
| **Auth Required** | ✅ All authenticated roles |
| **HTTP Method** | `POST` |
| **JSON Body Schema** (Zod-validated) | ```typescript { userId?: string (optional — defaults to self), title: string (required), message: string (required), type: "INFO" \| "SUCCESS" \| "WARNING" \| "ERROR" (default: "INFO") } ``` |
| **Success Response** | `201 Created` |
| **Response Schema** | ```json { "data": Notification } ``` |
| **Error Responses** | `400` — Validation failed |
| | `401` — Unauthorized |
| | `500` — Internal server error |

### `PATCH /api/notifications`
Mark notifications as read (single or bulk).

| Property | Detail |
|----------|--------|
| **Description** | Marks a notification as read or marks all as read |
| **Auth Required** | ✅ All authenticated roles |
| **HTTP Method** | `PATCH` |
| **Query Parameters** | `action=markRead` + `id=<notificationId>` → marks single notification |
| | `action=markAllRead` → marks all user's unread notifications |
| **Success Response** | `200 OK` — `{ data: Notification }` (single) |
| | `200 OK` — `{ message: "All notifications marked as read" }` (bulk) |
| **Error Responses** | `400` — Invalid action |
| | `401` — Unauthorized |
| | `500` — Internal server error |

### `PUT /api/notifications` (Push Subscription)
Subscribe a device for push notifications (Web Push protocol).

| Property | Detail |
|----------|--------|
| **Description** | Upserts a PushSubscription record for the authenticated user |
| **Auth Required** | ✅ All authenticated roles |
| **HTTP Method** | `PUT` |
| **JSON Body Schema** | ```typescript { endpoint: string (required, unique), keys: object (required), expiryTime: string \| null (optional) } ``` |
| **Logic** | `upsert` on `endpoint` — creates if new, updates if existing |
| **Success Response** | `200 OK` — `{ success: true }` |
| **Error Responses** | `401` — Unauthorized |
| | `500` — Internal server error |

---

## User Management Endpoints

### `GET /api/users`
List users (role-scoped).

| Property | Detail |
|----------|--------|
| **Description** | Returns users visible to the requesting role |
| **Auth Required** | ✅ All authenticated roles |
| **HTTP Method** | `GET` |
| **Query Parameters** | None |
| **Role Filtering** | - **SUPERADMIN**: All users (with unit info via `include: { unit: true }`) |
| | - **MANAGER**: Users where `unitId === session.user.unitId` |
| | - **PIMPINAN**: `403 Forbidden — Insufficient permissions` |
| | - **STAFF**: `403 Forbidden — Insufficient permissions` |
| **Success Response** | `200 OK` |
| **Response Schema** | ```json { "data": [User], "meta": { "count": number } } ``` |
| **User fields** (SUPERADMIN) | `id`, `name`, `email`, `role`, `unitId`, `isActive`, `createdAt`, `updatedAt`, `unit` {id, name, code, description, isActive, lembagaId, createdAt, updatedAt} |
| | (MANAGER variant: same select — no `_count` difference noted) |
| **Error Responses** | `401` — Unauthorized |
| | `403` — Insufficient permissions |
| | `500` — Internal server error |

### `POST /api/users`
Create a new user.

| Property | Detail |
|----------|--------|
**Auth Required** | ✅ SUPERADMIN only |
| **HTTP Method** | `POST` |
| **JSON Body Schema** (Zod-validated) | ```typescript { name: string (1-100, required), email: string (valid email, required), password: string (min 6, required), role: "SUPERADMIN" \| "PIMPINAN" \| "MANAGER" \| "STAFF" (default: STAFF), unitId?: string, isActive?: boolean (default: true) } ``` |
| **Logic** | 1. Check role = SUPERADMIN (403 otherwise) |
| | 2. Check duplicate email (case-insensitive) → `409` if exists |
| | 3. Verify unit exists + isActive if `unitId` provided → `400` if invalid |
| | 4. Hash password with bcrypt (10 rounds) |
| | 5. Create user + audit log (atomic) |
| **Success Response** | `201 Created` |
| **Response Schema** | ```json { "data": { id, name, email, role, unitId, isActive, createdAt }, "message": "User berhasil dibuat" } ``` |
| **Error Responses** | `400` — Validation failed / invalid unit |
| | `401` — Unauthorized |
| | `403` — Forbidden — Superadmin only |
| | `409` — Email already registered |
| | `500` — Internal server error |

### `GET /api/users/{id}`
Get a single user's detail.

| Property | Detail |
|----------|--------|
| **Description** | Fetches user detail with unit info |
| **Auth Required** | ✅ All authenticated roles |
| **HTTP Method** | `GET` |
| **Path Parameters** | `id: string` |
| **Success Response** | `200 OK` |
| **Response Schema** | ```json { "data": { "id", "name", "email", "role", "unitId", "isActive", "createdAt", "updatedAt", "unit": { "id", "name", "code", "isActive" } } } ``` |
| **RBAC Access** | - **SUPERADMIN**: Any user |
| | - **MANAGER**: Only if `user.unitId === session.user.unitId` → `403` otherwise |
| | - **PIMPINAN**: No explicit guard — can access any user (potential gap) |
| **Error Responses** | `400` — User ID required |
| | `401` — Unauthorized |
| | `403` — Forbidden (Manager cross-unit) |
| | `404` — User not found |
| | `500` — Internal server error |

### `PATCH /api/users/{id}`
Update user information.

| Property | Detail |
|----------|--------|
| **Description** | Updates user fields (name, email, password, role, unit, active status) |
| **Auth Required** | ✅ All authenticated roles (with RBAC) |
| **HTTP Method** | `PATCH` |
| **Path Parameters** | `id: string` |
| **JSON Body Schema** (Zod-validated) | ```typescript { name?: string (1-100), email?: string (valid email), password?: string (min 6), role?: "SUPERADMIN" \| "PIMPINAN" \| "MANAGER" \| "STAFF", unitId?: string \| null, isActive?: boolean } ``` |
| **RBAC Security** | - **MANAGER**: Cannot change `role` or `unitId` → `403` if attempted |
| | - **MANAGER**: Only own unit's users (unitId match required) → `403` otherwise |
| | - **PIMPINAN**: No explicit management guard in code |
| | - **SUPERADMIN**: Full access |
| **Password Handling** | If `password` provided → hash with bcrypt (10 rounds) and set `passwordHash` |
| **Audit Log** | Records old data (pre-update snapshot) and new data |
| **Success Response** | `200 OK` |
| **Response Schema** | ```json { "data": { id, name, email, role, unitId, isActive, updatedAt }, "message": "User berhasil diupdate" } ``` |
| **Error Responses** | `400` — Validation failed / invalid unit |
| | `401` — Unauthorized |
| | `403` — Forbidden / role escalation protection |
| | `404` — User not found |
| | `409` — Email already registered on another user |
| | `500` — Internal server error |

### `DELETE /api/users/{id}`
Soft-delete a user (set `isActive = false`).

| Property | Detail |
|----------|--------|
| **Description** | Deactivates a user (soft delete — sets `isActive = false`) |
| **Auth Required** | ✅ SUPERADMIN only |
| **HTTP Method** | `DELETE` |
| **Path Parameters** | `id: string` |
| **Security Checks** | - Prevents self-deletion (`id === session.user.id` → `400`) |
| | - Prevents deleting already-inactive user (`400` if `!existing.isActive`) |
| **Success Response** | `200 OK` |
| **Response Schema** | ```json { "message": "User berhasil dinonaktifkan", "data": { id, name, email, isActive } } ``` |
| **Error Responses** | `400` — Self-deletion attempt / already inactive |
| | `401` — Unauthorized |
| | `403` — Forbidden — Superadmin only |
| | `404` — User not found |
| | `500` — Internal server error |

---

## Unit (Unit/Organization) Endpoints

### `GET /api/units`
List all units (role-dependent detail level).

| Property | Detail |
|----------|--------|
| **Description** | Returns all units with varying detail by role |
| **Auth Required** | ✅ All authenticated roles |
| **HTTP Method** | `GET` |
| **Query Parameters** | None |
| **Role-Based Response** | - **SUPERADMIN**: Full detail including `_count` (users count, transactions count) |
| | - **Others (PIMPINAN/MANAGER/STAFF)**: Basic fields only (`isActive: true` filter applied) |
| **Success Response** | `200 OK` |
| **Response Schema** | ```json { "data": [Unit], "meta": { "count": number, "role": string } } ``` |
| **Unit fields (SUPERADMIN)** | `id`, `name`, `code`, `description`, `isActive`, `lembagaId`, `createdAt`, `updatedAt`, `_count` {users, transactions} |
| **Unit fields (others)** | `id`, `name`, `code`, `description`, `isActive`, `lembagaId`, `createdAt`, `updatedAt` |
| **Error Responses** | `401` — Unauthorized |
| | `500` — Internal server error |

### `POST /api/units`
Create a new unit.

| Property | Detail |
|----------|--------|
| **Description** | Creates a new unit (organization/department) |
| **Auth Required** | ✅ SUPERADMIN only |
| **HTTP Method** | `POST` |
| **JSON Body Schema** (Zod-validated) | ```typescript { name: string (required), code: string (1-20, uppercased), description?: string, isActive?: boolean (default: true), lembagaId?: string } ``` |
| **Logic** | 1. Role = SUPERADMIN check |
| | 2. Duplicate code check (case-insensitive) → `409` |
| | 3. Validate `lembagaId` if provided → `404` if not found |
| | 4. Create unit + audit log |
| **Success Response** | `201 Created` |
| **Response Schema** | ```json { "data": Unit, "message": "Unit berhasil dibuat" } ``` |
| **Error Responses** | `400` — Validation failed / invalid lembaga |
| | `401` — Unauthorized |
| | `403` — Forbidden — Superadmin only |
| | `409` — Unit code already exists |
| | `500` — Internal server error |

### `GET /api/units/{id}`
Get a single unit's detailed info.

| Property | Detail |
|----------|--------|
| **Description** | Fetches unit detail with user/transaction counts |
| **Auth Required** | ✅ All authenticated roles |
| **HTTP Method** | `GET` |
| **Path Parameters** | `id: string` |
| **Success Response** | `200 OK` |
| **Response Schema** | ```json { "data": { "id", "name", "code", "description", "isActive", "isRetail", "lembagaId", "createdAt", "updatedAt", "_count": { "users": number, "transactions": number } } } ``` |
| **Error Responses** | `400` — Unit ID required |
| | `401` — Unauthorized |
| | `404` — Unit not found |
| | `500` — Internal server error |

### `PATCH /api/units/{id}`
Update a unit.

| Property | Detail |
|----------|--------|
| **Description** | Updates unit fields |
| **Auth Required** | ✅ SUPERADMIN only |
| **HTTP Method** | `PATCH` |
| **Path Parameters** | `id: string` |
| **JSON Body Schema** (Zod-validated) | ```typescript { name?: string, code?: string (uppercased), description?: string, isActive?: boolean, isRetail?: boolean, lembagaId?: string } ``` |
| **Logic** | 1. Role = SUPERADMIN check |
| | 2. Duplicate code check (excluding self) → `409` |
| | 3. Validate `lembagaId` if provided → `404` |
| | 4. Update + audit log (records old/new data) |
| **Success Response** | `200 OK` |
| **Response Schema** | ```json { "data": { id, name, code, description, isActive, updatedAt }, "message": "Unit berhasil diupdate" } ``` |
| **Error Responses** | `400` — Validation failed |
| | `401` — Unauthorized |
| | `403` — Forbidden |
| | `404` — Unit not found |
| | `409` — Code already used |
| | `500` — Internal server error |

### `DELETE /api/units/{id}`
Soft-delete a unit (set `isActive = false`).

| Property | Detail |
|----------|--------|
| **Description** | Deactivates a unit (requires no active users first) |
| **Auth Required** | ✅ SUPERADMIN only |
| **HTTP Method** | `DELETE` |
| **Path Parameters** | `id: string` |
| **Pre-condition** | Unit must have **zero users** → `400` "Unit masih memiliki pengguna — nonaktifkan dulu semua user" otherwise |
| **Success Response** | `200 OK` |
| **Response Schema** | ```json { "message": "Unit berhasil dinonaktifkan", "data": { id, name, isActive } } ``` |
| **Error Responses** | `400` — Unit has active users |
| | `401` — Unauthorized |
| | `403` — Forbidden |
| | `404` — Unit not found |
| | `500` — Internal server error |

### `POST /api/units/{id}`
Alias endpoint — always returns `400 "Use POST /api/units"`.

| Property | Detail |
|----------|--------|
| **Description** | Guard rail — redirects creation to parent POST. Does not create. |
| **Auth Required** | ✅ SUPERADMIN check (returns 403 if not) |
| **HTTP Method** | `POST` |
| **Response** | `400` — `{ error: "Use POST /api/units" }` |

---

## Account (Chart of Accounts) Endpoints

### `GET /api/accounts`
List chart of accounts.

| Property | Detail |
|----------|--------|
| **Description** | Returns accounts with hierarchical parent/children relations |
| **Auth Required** | ✅ SUPERADMIN or PIMPINAN only (`403` otherwise) |
| **HTTP Method** | `GET` |
| **Query Parameters** | `type?` — filter by AccountType (ASSET/LIABILITY/EQUITY/INCOME/EXPENSE) |
| | `isActive?` — `"true"` or `"false"` |
| **Success Response** | `200 OK` |
| **Response Schema** | ```json { "data": [Account], "meta": { "count": number } } ``` |
| **Account fields** | `id`, `name`, `code`, `type`, `description`, `isActive`, `parentId`, `parent` {id, name, code}, `children` [{id, name, code}] |
| **Error Responses** | `401` — Unauthorized |
| | `403` — "Akses ditolak" |
| | `500` — "Gagal memuat akun" |

### `POST /api/accounts`
Create a new account.

| Property | Detail |
|----------|--------|
| **Description** | Creates a chart of accounts entry |
| **Auth Required** | ✅ SUPERADMIN only |
| **HTTP Method** | `POST` |
| **JSON Body Schema** (Zod-validated) | ```typescript { code: string (required, unique), name: string (required, unique), type: "ASSET" \| "LIABILITY" \| "EQUITY" \| "INCOME" \| "EXPENSE" (required), description?: string, parentId?: string, isActive?: boolean (default: true) } ``` |
| **Logic** | Duplicate code check → `409`; auto audit log |
| **Success Response** | `201 Created` |
| **Response Schema** | ```json { "data": Account, "message": "Akun berhasil dibuat" } ``` |
| **Account created fields** | `id`, `name`, `code`, `type`, `description`, `isActive`, `parentId`, `createdAt` |
| **Error Responses** | `400` — Validation failed |
| | `401` — Unauthorized |
| | `403` — "Akses ditolak — Superadmin only" |
| | `409` — Account code already exists |
| | `500` — "Gagal membuat akun" |

---

## Lembaga (Institution) Endpoints

### `GET /api/lembaga`
List institutions.

| Property | Detail |
|----------|--------|
| **Description** | Returns institutions; SUPERADMIN gets inactive flag filtering |
| **Auth Required** | ✅ All authenticated roles |
| **HTTP Method** | `GET` |
| **Query Parameters** | `isActive?` — `"true"` or `"false"` (SUPERADMIN only) |
| **Role Filtering** | - **SUPERADMIN**: Filterable by `isActive`; includes `units` count |
| | - **Others**: Only active institutions for reference |
| **Success Response** | `200 OK` |
| **Response Schema** | ```json { "data": [Lembaga], "meta": { "count": number, "role": string } } ``` |
| **Lembaga fields (SUPERADMIN)** | `id`, `name`, `code`, `description`, `isActive`, `createdAt`, `updatedAt`, `_count` {units} |
| **Lembaga fields (others)** | `id`, `name`, `code`, `description`, `isActive`, `createdAt`, `updatedAt` |
| **Error Responses** | `401` — Unauthorized |
| | `500` — Internal server error |

### `POST /api/lembaga`
Create a new institution.

| Property | Detail |
|----------|--------|
| **Description** | Creates a new lembaga |
| **Auth Required** | ✅ SUPERADMIN only |
| **HTTP Method** | `POST` |
| **JSON Body Schema** (Zod-validated) | ```typescript { name: string (required, unique), code?: string (max 20, uppercased), description?: string, isActive?: boolean (default: true) } ``` |
| **Logic** | Duplicate code check (if provided) → `409`; auto audit log |
| **Success Response** | `201 Created` |
| **Response Schema** | ```json { "data": Lembaga, "message": "Lembaga berhasil dibuat" } ``` |
| **Error Responses** | `400` — Validation failed |
| | `401` — Unauthorized |
| | `403` — Forbidden — Superadmin only |
| | `409` — Code already exists |
| | `500` — Internal server error |

### `GET /api/lembaga/{id}`
Get a single institution's detail (with units).

| Property | Detail |
|----------|--------|
| **Description** | Fetches institution with all related units |
| **Auth Required** | ✅ All authenticated roles |
| **HTTP Method** | `GET` |
| **Path Parameters** | `id: string` (from route param) |
| **Success Response** | `200 OK` |
| **Response Schema** | ```json { "data": { "id", "name", "code", "description", "isActive", "createdAt", "updatedAt", "units": [Unit] } } ``` |
| **Error Responses** | `401` — Unauthorized |
| | `404` — "Lembaga tidak ditemukan" |
| | `500` — Internal server error |

### `PUT /api/lembaga/{id}`
Update an institution (full replace semantics, not PATCH-style partial).

| Property | Detail |
|----------|--------|
| **Description** | Updates institution fields (hard replace) |
| **Auth Required** | ✅ SUPERADMIN only |
| **HTTP Method** | `PUT` |
| **Path Parameters** | `id: string` |
| **JSON Body Schema** (Zod-validated) | ```typescript { name?: string, code?: string, description?: string, isActive?: boolean } ``` |
| **Logic** | Duplicate code check (excluding self) → `409`; audit log with old/new |
| **Success Response** | `200 OK` |
| **Response Schema** | ```json { "data": Lembaga, "message": "Lembaga berhasil diperbarui" } ``` |
| **Error Responses** | `400` — Validation failed |
| | `401` — Unauthorized |
| | `403` — Forbidden |
| | `404` — Lembaga tidak ditemukan |
| | `409` — Code already used |
| | `500` — Internal server error |

### `DELETE /api/lembaga/{id}`
Hard-delete an institution.

| Property | Detail |
|----------|--------|
| **Description** | Permanently deletes a lembaga record |
| **Auth Required** | ✅ SUPERADMIN only |
| **HTTP Method** | `DELETE` |
| **Path Parameters** | `id: string` |
| **Success Response** | `200 OK` — `{ message: "Lembaga berhasil dihapus" }` |
| **Error Responses** | `401` — Unauthorized |
| | `403` — Forbidden |
| | `404` — Lembaga tidak ditemukan |
| | `500` — Internal server error |

---

## Audit Log Endpoints

### `GET /api/audit-logs`
Retrieve audit trail (paginated).

| Property | Detail |
|----------|--------|
| **Description** | Returns audit log entries with user details |
| **Auth Required** | ✅ SUPERADMIN only |
| **HTTP Method** | `GET` |
| **Query Parameters** | `entity?` — filter by entity name (e.g., "user", "transaction", "unit") |
| | `page?` — page number (default: 1, min: 1) |
| | `limit?` — items per page (default: 50, max: 100) |
| **Success Response** | `200 OK` |
| **Response Schema** | ```json { "data": [AuditLog], "meta": { "total": number, "page": number, "limit": number } } ``` |
| **AuditLog fields** | `id`, `userId`?, `action`, `entity`, `entityId`?, `oldData`?, `newData`?, `ipAddress`?, `userAgent`?, `createdAt`, `user` {id, name, email, role} |
| **Error Responses** | `401` — Unauthorized |
| | `403` — "SUPERADMIN only" |
| | `500` — Internal server error |

---

## Reconciliation / Buku Besar Endpoints

### `GET /api/reconciliation`
Ledger reconciliation summary per account + unit.

| Property | Detail |
|----------|--------|
| **Description** | Returns reconciliation data: transactions grouped by account and by unit, plus a paginated transaction list |
| **Auth Required** | ✅ PIMPINAN, MANAGER, SUPERADMIN only (STAFF → 403) |
| **HTTP Method** | `GET` |
| **Query Parameters** | | Parameter | Type | Default | Description |
| | | `unitId?` | string | — | Filter by unit (SA/PIMPINAN only; MANAGER uses own unit) |
| | | `accountId?` | string | — | Filter by account |
| | | `from?` | ISO datetime | — | Start date filter |
| | | `to?` | ISO datetime | — | End date filter (inclusive) |
| | | `status?` | "APPROVED" \| "ALL" | "APPROVED" | Transaction status filter |
| | **Validation** | Zod `querySchema` — validates all params |
| | **Role RBAC** | - **STAFF**: `403` — "Staff tidak memiliki akses ke rekonsiliasi" |
| | | - **MANAGER**: Uses own `unitId`; ignores `unitId` param |
| | | - **SUPERADMIN/PIMPINAN**: Uses `unitId` param if provided |
| **Success Response** | `200 OK` |
| **Response Schema** | ```json { "data": { "summary": { "byAccount": [{ "account": {id, name, code, type} \| null, "totalAmount": number, "transactionCount": number }], "byUnit": [{ "unit": {id, name, code} \| null, "totalAmount": number, "transactionCount": number }] }, "transactions": [Transaction] }, "meta": { "count": number, "filters": { unitId, accountId, from, to, status } } } ``` |
| **Error Responses** | `400` — Invalid query params |
| | `401` — Unauthorized |
| | `403` — Staff access denied |
| | `500` — Internal server error |

---

## Reports Export Endpoints

### `GET /api/reports/export`
Export all transactions as CSV or JSON.

| Property | Detail |
|----------|--------|
| **Description** | Exports all transactions (PIMPINAN view — all units) |
| **Auth Required** | ✅ PIMPINAN only |
| **HTTP Method** | `GET` |
| **Query Parameters** | `format?` | "csv" \| "json" | "csv" (default) |
| **Success Response** | `200 OK` |
| **Response Schema (CSV)** | Headers: `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="laporan-transaksi-YYYY-MM-DD.csv"` |
| **CSV Columns** | `ID`, `Tanggal`, `Unit`, `Tipe`, `Jumlah`, `Deskripsi`, `Status`, `Referensi`, `Pembuat` |
| **Response Schema (JSON)** | ```json { "data": [Transaction] } ``` |
| | Transaction fields: `id`, `type`, `amount`, `description`, `status`, `reference`, `createdAt`, `unit` {name, code}, `createdBy` {name, email} |
| | **Limit**: 5000 records |
| **Error Responses** | `401` — Unauthorized (non-PIMPINAN) |

---

## AI Integration Endpoints

### `POST /api/ai/chat`
Forward chat message to AI provider (supports file upload).

| Property | Detail |
|----------|--------|
| **Description** | Proxies chat to configured AI provider |
| **Auth Required** | ❌ Not checked (public endpoint — relies on client-side gating) |
| **HTTP Method** | `POST` |
| **Content-Type** | `application/json` or `multipart/form-data` |
| **JSON Body Schema** (Zod-validated) | ```typescript { message: string (min 1, required), history?: Array<{ role: "user" \| "assistant", content: string }> } ``` |
| **FormData Fields** | `message` (string), `history` (JSON string), `file` (File — saved to temp dir) |
| **Env Config Required** | `AI_PROVIDER_URL`, `AI_PROVIDER_KEY` |
| | Optional: `AI_PROVIDER_MODEL` (default: "Hamdan-MAX") |
| **AI Provider Proxy** | Forwards to `{base URL}/chat/completions` with `Authorization: Bearer <key>` |
| **Success Response** | `200 OK` |
| **Response Schema** | ```json { "message": string } ``` |
| **Error Responses** | `400` — Invalid request body |
| | `500` — AI provider not configured / request error / timeout (30s) |

---

## Auth Config (`src/lib/auth.ts`)

### Session Structure
```typescript
// JWT Token (next-auth/jwt)
interface JWT {
  id: string;
  role: "SUPERADMIN" | "PIMPINAN" | "MANAGER" | "STAFF";
  unitId: string | null;
}

// Session User
interface Session {
  user: {
    id: string;
    role: UserRole;
    unitId: string | null;
    // + DefaultSession fields (name, email, image)
  }
}
```

### Credentials Provider
- **Method**: `POST /api/auth/callback/credentials`
- **Input**: `{ email: string, password: string }`
- **Logic**: Prisma `findUnique({ where: { email } })` → `bcrypt.compare(password, user.passwordHash)`
- **Returns**: `{ id, email, name, role, unitId }` if valid
- **Session Strategy**: JWT (`session.strategy = 'jwt'`)
- **Secret**: `process.env.NEXTAUTH_SECRET`
- **Sign-in page**: `/login`

---

## Middleware (`src/middleware.ts`)

| Feature | Detail |
|---------|--------|
| **Token Extraction** | `getToken({ req, secret: process.env.NEXTAUTH_SECRET })` — reads JWT from cookie/header |
| **Public Paths** | `/login`, `/api/auth/*`, `/_next/*`, `/favicon*`, `/`, `*.png` |
| **Dashboard Redirect** | `/dashboard` or `/dashboard/` → redirects to `/dashboard/{role-lowercase}` |
| **Role Enforcement** | Non-SUPERADMIN cannot access `/dashboard/{other-role}` → redirected to own role home |
| **Malformed URL Fix** | `/dashboard/{role}/dashboard/xxx` → `/dashboard/xxx` |
| **Shared Paths** | `/dashboard/rekonsiliasi`, `/dashboard/reports`, `/dashboard/account` — accessible to all authenticated roles |
| | | **Matcher** | Excludes `/api/auth`, `/_next/static`, `/_next/image`, `favicon.ico`, `*.png` from middleware processing |

---

## RBAC Summary Matrix

| Action | SUPERADMIN | PIMPINAN | MANAGER | STAFF |
|--------|-----------|----------|---------|-------|
| **Login** | ✅ | ✅ | ✅ | ✅ |
| **Logout** | ✅ | ✅ | ✅ | ✅ |
| **List Users** | ✅ (all) | ❌ (403) | ✅ (own unit) | ❌ (403) |
| **Create User** | ✅ | ❌ (403) | ❌ (403) | ❌ (403) |
| **Update User** | ✅ (any) | ⚠️ (no guard, code gap) | ✅ (own unit, no role change) | ❌ (403) |
| **Delete User** | ✅ (soft) | ❌ (403) | ❌ (403) | ❌ (403) |
| **List Units** | ✅ (full) | ✅ (basic) | ✅ (basic) | ✅ (basic) |
| **Create Unit** | ✅ | ❌ (403) | ❌ (403) | ❌ (403) |
| **Update Unit** | ✅ | ❌ (403) | ❌ (403) | ❌ (403) |
| **Delete Unit** | ✅ (if no users) | ❌ (403) | ❌ (403) | ❌ (403) |
| **List Transactions** | ✅ (all) | ✅ (all) | ✅ (own unit) | ✅ (own) |
| **Create Transaction** | ✅ (any unit) | ✅ (any unit) | ✅ (own unit forced) | ✅ (own unit forced) |
| **Update Transaction** | ✅ | ⚠️ (code: no ownership guard except DRAFT/PENDING check) | ✅ (own unit) | ✅ (own) |
| **Delete Transaction** | ✅ | ✅ (all PENDING/DRAFT) | ✅ (own unit) | ✅ (own) |
| **List Approvals** | ✅ (all) | ✅ (all) | ✅ (unit) | ✅ (own) |
| **Approve/Reject** | ✅ | ✅ | ⚠️ (code allows but RBAC checks unit match) | ⚠️ (code allows but unlikely useful) |
| **List Accounts** | ✅ | ✅ | ❌ (403) | ❌ (403) |
| **Create Account** | ✅ | ❌ (403) | ❌ (403) | ❌ (403) |
| **List Lembaga** | ✅ (filterable) | ✅ (active only) | ✅ (active only) | ✅ (active only) |
| **Create Lembaga** | ✅ | ❌ (403) | ❌ (403) | ❌ (403) |
| **Update Lembaga** | ✅ | ❌ (403) | ❌ (403) | ❌ (403) |
| **Delete Lembaga** | ✅ | ❌ (403) | ❌ (403) | ❌ (403) |
| **Audit Logs** | ✅ (paginated) | ❌ (403) | ❌ (403) | ❌ (403) |
| **Notifications (GET)** | ✅ | ✅ | ✅ | ✅ |
| **Notifications (POST)** | ✅ | ✅ | ✅ | ✅ |
| **Notifications (PATCH)** | ✅ | ✅ | ✅ | ✅ |
| **Push Subscription (PUT)** | ✅ | ✅ | ✅ | ✅ |
| **Reconciliation** | ✅ | ✅ | ✅ (own unit) | ❌ (403) |
| **Reports Export** | ❌ (401) | ✅ (csv/json) | ❌ (401) | ❌ (401) |
| **AI Chat** | ✅ | ✅ | ✅ | ✅ |

---

## Key Notes for Mobile App Integration

### Authentication Token Flow
1. **Mobile Login**: `POST /api/mobile/auth/login` — returns `{ accessToken, user }`
2. **Token Usage**: The `accessToken` is a NextAuth JWT. Use it as:
   - **Cookie**: `next-auth.session-token=<accessToken>` (preferred — works with `getServerSession`)
   - OR **Header**: `Authorization: Bearer <accessToken>` — requires JWT verification on backend (not currently implemented in the API routes, which use `getServerSession`)
3. **Logout**: `POST /api/mobile/auth/logout` — clears the session cookie
4. **Token TTL**: 30 days (JWT `maxAge`)

> ⚠️ **Important**: The API routes use `getServerSession(authConfig)` which reads the `next-auth.session-token` cookie. Mobile clients **must send the token as a cookie**, not just a Bearer header, for most endpoints to authenticate correctly.

### Approval Threshold Logic
The FRD mentions amount-based approval thresholds (INCOME ≥ 10,000,000, EXPENSE ≥ 1,000,000), but the actual `POST /api/transactions` code **always sets status to `PENDING`**. The threshold logic from the FRD is not implemented in the current codebase.

### Transaction Status Lifecycle
```
DRAFT → PENDING → [Approve] → APPROVED
                 ↘ [Reject] → REJECTED
```
- `PATCH /api/transactions/{id}`: Only DRAFT or PENDING can be edited
- `DELETE`: Only DRAFT or PENDING can be deleted
- `POST /api/approvals`: Only PENDING transactions can be approved/rejected
