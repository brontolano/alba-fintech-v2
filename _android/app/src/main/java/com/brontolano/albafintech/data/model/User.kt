package com.brontolano.albafintech.data.model

import kotlinx.serialization.Serializable

/**
 * User data class.
 */
@Serializable
data class User(
    val id: Long = 0,
    val name: String = "",
    val email: String = "",
    val photoUrl: String? = null,
    val role: UserRole = UserRole.STAFF,
    val unitId: Long = 0,
    val unitName: String = ""
)

/**
 * Dashboard statistics response.
 */
@Serializable
data class DashboardStats(
    val totalIncome: Double = 0.0,
    val totalExpense: Double = 0.0,
    val netProfit: Double = 0.0,
    val transactionCount: Int = 0,
    val pendingTransactions: Int = 0,
    val approvedTransactions: Int = 0,
    val rejectedTransactions: Int = 0,
    val topUnits: List<UnitPerformance> = emptyList()
)

/**
 * Unit performance data for dashboard.
 */
@Serializable
data class UnitPerformance(
    val unitId: Long = 0,
    val unitName: String = "",
    val income: Double = 0.0,
    val expense: Double = 0.0,
    val net: Double = 0.0
)