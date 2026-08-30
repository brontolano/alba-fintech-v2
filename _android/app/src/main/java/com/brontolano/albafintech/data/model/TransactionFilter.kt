package com.brontolano.albafintech.data.model

import kotlinx.serialization.Serializable

/**
 * Transaction filter criteria.
 */
@Serializable
data class TransactionFilter(
    val status: TransactionStatus? = null,
    val unitId: Long? = null,
    val dateFrom: String? = null,
    val dateTo: String? = null,
    val searchQuery: String? = null
)

/**
 * Request body for creating a transaction.
 */
@Serializable
data class CreateTransactionRequest(
    val description: String = "",
    val amount: Double = 0.0,
    val type: TransactionType = TransactionType.EXPENSE,
    val unitId: Long = 0,
    val categoryId: Long? = null,
    val date: String? = null,
    val status: TransactionStatus = TransactionStatus.DRAFT
)

/**
 * Request body for updating a transaction.
 */
@Serializable
data class UpdateTransactionRequest(
    val id: Long,
    val description: String = "",
    val amount: Double = 0.0,
    val type: TransactionType = TransactionType.EXPENSE,
    val unitId: Long = 0,
    val categoryId: Long? = null,
    val date: String? = null,
    val status: TransactionStatus = TransactionStatus.DRAFT
)