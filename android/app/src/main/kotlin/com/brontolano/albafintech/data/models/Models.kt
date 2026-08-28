package com.brontolano.albafintech.data.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Wrapper for all API responses that return { data: ..., meta?: {...} }.
 * Used by the Next.js app at https://alba.brontolano.com/api
 */
@Serializable
data class ApiResponse<T>(
    @SerialName("data") val data: T? = null,
    @SerialName("meta") val meta: kotlinx.serialization.json.JsonElement? = null,
    @SerialName("error") val error: String? = null,
    @SerialName("message") val message: String? = null
)

/**
 * Mobile auth login response from /api/mobile/auth/login.
 */
@Serializable
data class AuthResponse(
    @SerialName("accessToken") val accessToken: String? = null,
    @SerialName("user") val user: User? = null,
    @SerialName("error") val error: String? = null
)

@Serializable
data class User(
    @SerialName("id") val id: String,
    @SerialName("name") val name: String? = null,
    @SerialName("email") val email: String,
    @SerialName("role") val role: String,
    @SerialName("unitId") val unitId: String? = null,
    @SerialName("lembagaId") val lembagaId: String? = null
)

@Serializable
data class CountData(
    @SerialName("users") val users: Int = 0,
    @SerialName("transactions") val transactions: Int = 0
)

@Serializable
data class Unit(
    @SerialName("id") val id: String,
    @SerialName("name") val name: String,
    @SerialName("code") val code: String,
    @SerialName("description") val description: String? = null,
    @SerialName("isActive") val isActive: Boolean = true,
    @SerialName("lembagaId") val lembagaId: String? = null,
    @SerialName("createdAt") val createdAt: String? = null,
    @SerialName("updatedAt") val updatedAt: String? = null,
    @SerialName("_count") val count: CountData? = null
)

@Serializable
data class UserName(
    @SerialName("name") val name: String? = null,
    @SerialName("email") val email: String? = null,
    @SerialName("role") val role: String? = null
)

@Serializable
data class TransactionType(
    @SerialName("INCOME") val income: String? = null,
    @SerialName("EXPENSE") val expense: String? = null
)

// Request bodies
@Serializable
data class LoginRequest(
    @SerialName("email") val email: String,
    @SerialName("password") val password: String
)

@Serializable
data class CreateTransactionRequest(
    @SerialName("unitId") val unitId: String,
    @SerialName("type") val type: String,
    @SerialName("amount") val amount: Double,
    @SerialName("description") val description: String,
    @SerialName("reference") val reference: String? = null,
    @SerialName("accountId") val accountId: String? = null
)

@Serializable
data class UpdateTransactionRequest(
    @SerialName("type") val type: String? = null,
    @SerialName("amount") val amount: Double? = null,
    @SerialName("description") val description: String? = null,
    @SerialName("reference") val reference: String? = null,
    @SerialName("status") val status: String? = null,
    @SerialName("accountId") val accountId: String? = null
)

@Serializable
data class ApproveRequest(
    @SerialName("transactionId") val transactionId: String,
    @SerialName("action") val action: String,
    @SerialName("comment") val comment: String? = null
)

@Serializable
data class MessageResponse(
    @SerialName("message") val message: String? = null
)

// Transaction response fields (nested objects)
@Serializable
data class UnitInfo(
    @SerialName("name") val name: String,
    @SerialName("code") val code: String
)

@Serializable
data class UserInfo(
    @SerialName("name") val name: String? = null,
    @SerialName("email") val email: String? = null,
    @SerialName("role") val role: String? = null,
    @SerialName("unit") val unit: UnitInfo? = null
)

@Serializable
data class AccountInfo(
    @SerialName("name") val name: String,
    @SerialName("code") val code: String
)

@Serializable
data class Transaction(
    @SerialName("id") val id: String,
    @SerialName("type") val type: String? = null,
    @SerialName("amount") val amount: Double = 0.0,
    @SerialName("description") val description: String,
    @SerialName("status") val status: String = "DRAFT",
    @SerialName("reference") val reference: String? = null,
    @SerialName("unitId") val unitId: String,
    @SerialName("lembagaId") val lembagaId: String? = null,
    @SerialName("createdById") val createdById: String,
    @SerialName("accountId") val accountId: String? = null,
    @SerialName("createdAt") val createdAt: String,
    @SerialName("updatedAt") val updatedAt: String? = null,
    @SerialName("approvedById") val approvedById: String? = null,
    @SerialName("approvedAt") val approvedAt: String? = null,
    @SerialName("unit") val unit: UnitInfo? = null,
    @SerialName("createdBy") val createdBy: UserInfo? = null,
    @SerialName("approvedBy") val approvedBy: UserInfo? = null,
    @SerialName("account") val account: AccountInfo? = null
)

@Serializable
data class Approval(
    @SerialName("id") val id: String,
    @SerialName("transactionId") val transactionId: String,
    @SerialName("transaction") val transaction: Transaction? = null,
    @SerialName("status") val status: String = "PENDING",
    @SerialName("approverId") val approverId: String? = null,
    @SerialName("approver") val approver: UserInfo? = null,
    @SerialName("createdAt") val createdAt: String,
    @SerialName("updatedAt") val updatedAt: String? = null,
    @SerialName("comment") val comment: String? = null
)

@Serializable
data class Lembaga(
    @SerialName("id") val id: String,
    @SerialName("name") val name: String,
    @SerialName("code") val code: String? = null,
    @SerialName("description") val description: String? = null,
    @SerialName("isActive") val isActive: Boolean = true,
    @SerialName("createdAt") val createdAt: String? = null,
    @SerialName("updatedAt") val updatedAt: String? = null
)

@Serializable
data class Account(
    @SerialName("id") val id: String,
    @SerialName("name") val name: String,
    @SerialName("code") val code: String,
    @SerialName("type") val type: String? = null,
    @SerialName("description") val description: String? = null,
    @SerialName("parentId") val parentId: String? = null,
    @SerialName("isActive") val isActive: Boolean = true,
    @SerialName("createdAt") val createdAt: String? = null,
    @SerialName("updatedAt") val updatedAt: String? = null
)

@Serializable
data class Notification(
    @SerialName("id") val id: String,
    @SerialName("userId") val userId: String? = null,
    @SerialName("title") val title: String,
    @SerialName("message") val message: String,
    @SerialName("type") val type: String = "INFO",
    @SerialName("isRead") val isRead: Boolean = false,
    @SerialName("createdAt") val createdAt: String,
    @SerialName("updatedAt") val updatedAt: String? = null
)

@Serializable
data class AuditLog(
    @SerialName("id") val id: String,
    @SerialName("userId") val userId: String? = null,
    @SerialName("action") val action: String,
    @SerialName("entity") val entity: String,
    @SerialName("entityId") val entityId: String? = null,
    @SerialName("oldData") val oldData: String? = null,
    @SerialName("newData") val newData: String? = null,
    @SerialName("createdAt") val createdAt: String,
    @SerialName("user") val user: UserInfo? = null
)

// Dashboard summary
@Serializable
data class DashboardSummary(
    @SerialName("totalTransactions") val totalTransactions: Int = 0,
    @SerialName("approvedTransactions") val approvedTransactions: Int = 0,
    @SerialName("pendingTransactions") val pendingTransactions: Int = 0,
    @SerialName("totalIncome") val totalIncome: Double = 0.0,
    @SerialName("totalExpense") val totalExpense: Double = 0.0
)

// Enum helpers
enum class ApprovalStatus(val label: String) {
    PENDING("Menunggu"),
    APPROVED("Disetujui"),
    REJECTED("Ditolak")
}

enum class TransactionStatus(val label: String) {
    DRAFT("Draft"),
    PENDING("Menunggu Persetujuan"),
    APPROVED("Disetujui"),
    REJECTED("Ditolak")
}
