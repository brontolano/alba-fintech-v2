package com.brontolano.albafintech.data.model

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

/**
 * Dashboard statistics returned by GET /api/dashboard/stats.
 */
@JsonClass(generateAdapter = true)
data class DashboardStats(
    @Json(name = "total_units") val totalUnits: Int = 0,
    @Json(name = "total_transactions") val totalTransactions: Long = 0,
    @Json(name = "total_amount") val totalAmount: Double = 0.0,
    @Json(name = "pending_approvals") val pendingApprovals: Int = 0,
    @Json(name = "unit_breakdowns") val unitBreakdowns: List<UnitBreakdown> = emptyList(),
    @Json(name = "recent_transactions") val recentTransactions: List<TransactionSummary> = emptyList(),
    @Json(name = "monthly_stats") val monthlyStats: List<MonthlyStat> = emptyList()
)

/**
 * Financial breakdown for a single unit.
 */
@JsonClass(generateAdapter = true)
data class UnitBreakdown(
    @Json(name = "unit_id") val unitId: Long = 0,
    @Json(name = "unit_name") val unitName: String = "",
    @Json(name = "balance") val balance: Double = 0.0,
    @Json(name = "debit") val debit: Double = 0.0,
    @Json(name = "credit") val credit: Double = 0.0
)

/**
 * Monthly income/expense statistics for charting.
 */
@JsonClass(generateAdapter = true)
data class MonthlyStat(
    @Json(name = "month") val month: String = "",
    @Json(name = "income") val income: Double = 0.0,
    @Json(name = "expense") val expense: Double = 0.0
)

/**
 * Wrapper for dashboard stats API response.
 */
@JsonClass(generateAdapter = true)
data class DashboardResponse(
    @Json(name = "success") val success: Boolean = false,
    @Json(name = "data") val data: DashboardStats? = null,
    @Json(name = "message") val message: String? = null
)
