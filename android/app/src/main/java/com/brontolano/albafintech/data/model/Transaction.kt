package com.brontolano.albafintech.data.model

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

/**
 * Status of a transaction in the approval workflow.
 */
enum class TransactionStatus {
    @Json(name = "DRAFT") DRAFT,
    @Json(name = "PENDING") PENDING,
    @Json(name = "APPROVED") APPROVED,
    @Json(name = "REJECTED") REJECTED
}

/**
 * Type of transaction: income (inflow) or expense (outflow).
 */
enum class TransactionType {
    @Json(name = "INCOME") INCOME,
    @Json(name = "EXPENSE") EXPENSE
}

/**
 * Full transaction record returned by the API.
 */
@JsonClass(generateAdapter = true)
data class Transaction(
    @Json(name = "id") val id: Long = 0,
    @Json(name = "transaction_number") val transactionNumber: String = "",
    @Json(name = "unit_id") val unitId: Long = 0,
    @Json(name = "unit_name") val unitName: String = "",
    @Json(name = "amount") val amount: Double = 0.0,
    @Json(name = "description") val description: String = "",
    @Json(name = "status") val status: TransactionStatus = TransactionStatus.DRAFT,
    @Json(name = "type") val type: TransactionType = TransactionType.EXPENSE,
    @Json(name = "method") val method: String = "Tunai",
    @Json(name = "category") val category: String = "",
    @Json(name = "photo_url") val photoUrl: String? = null,
    @Json(name = "latitude") val latitude: Double? = null,
    @Json(name = "longitude") val longitude: Double? = null,
    @Json(name = "created_by") val createdBy: String = "",
    @Json(name = "approver_name") val approverName: String? = null,
    @Json(name = "created_at") val createdAt: String = "",
    @Json(name = "updated_at") val updatedAt: String = "",
    @Json(name = "approved_at") val approvedAt: String? = null
)

/**
 * Summary representation of a transaction used in list views.
 */
@JsonClass(generateAdapter = true)
data class TransactionSummary(
    @Json(name = "id") val id: Long = 0,
    @Json(name = "transaction_number") val transactionNumber: String = "",
    @Json(name = "unit_name") val unitName: String = "",
    @Json(name = "amount") val amount: Double = 0.0,
    @Json(name = "description") val description: String = "",
    @Json(name = "status") val status: TransactionStatus = TransactionStatus.DRAFT,
    @Json(name = "type") val type: TransactionType = TransactionType.EXPENSE,
    @Json(name = "date") val date: String = "",
    @Json(name = "category") val category: String = "",
    @Json(name = "photo_url") val photoUrl: String? = null
)

/**
 * Request body for creating or updating a transaction.
 */
@JsonClass(generateAdapter = true)
data class TransactionRequest(
    @Json(name = "unit_id") val unitId: Long,
    @Json(name = "amount") val amount: Double,
    @Json(name = "description") val description: String,
    @Json(name = "type") val type: TransactionType,
    @Json(name = "method") val method: String = "Tunai",
    @Json(name = "category") val category: String = "",
    @Json(name = "photo_url") val photoUrl: String? = null,
    @Json(name = "latitude") val latitude: Double? = null,
    @Json(name = "longitude") val longitude: Double? = null
)

/**
 * Pagination metadata returned by list endpoints.
 */
@JsonClass(generateAdapter = true)
data class PaginationMeta(
    @Json(name = "current_page") val currentPage: Int = 1,
    @Json(name = "last_page") val lastPage: Int = 1,
    @Json(name = "per_page") val perPage: Int = 20,
    @Json(name = "total") val total: Int = 0
)

/**
 * Paginated response wrapper for list endpoints.
 */
@JsonClass(generateAdapter = true)
data class PaginatedResponse<T>(
    @Json(name = "data") val data: List<T> = emptyList(),
    @Json(name = "meta") val meta: PaginationMeta = PaginationMeta(),
    @Json(name = "message") val message: String? = null
)

/**
 * Response wrapper for creating or updating a single transaction resource.
 */
@JsonClass(generateAdapter = true)
data class TransactionResponse(
    @Json(name = "success") val success: Boolean = false,
    @Json(name = "data") val data: Transaction? = null,
    @Json(name = "message") val message: String? = null
)
