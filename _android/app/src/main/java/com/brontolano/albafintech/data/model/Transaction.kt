package com.brontolano.albafintech.data.model

import kotlinx.serialization.Serializable

/**
 * Company/Organization Unit data class for dropdown/populating unit lists.
 */
@Serializable
data class CompanyUnit(
    val id: Long = 0,
    val name: String = "",
    val code: String = ""
)

/**
 * Transaction data class.
 */
@Serializable
data class Transaction(
    val id: Long = 0,
    val description: String = "",
    val amount: Double = 0.0,
    val type: TransactionType = TransactionType.EXPENSE,
    val status: TransactionStatus = TransactionStatus.PENDING,
    val unitId: Long = 0,
    val unitName: String = "",
    val categoryId: Long? = null,
    val categoryName: String? = null,
    val date: String = "",
    val createdAt: String = "",
    val updatedAt: String = "",
    val createdBy: String? = null
)

/**
 * Transaction summary for list views.
 */
@Serializable
data class TransactionSummary(
    val id: Long = 0,
    val description: String = "",
    val amount: Double = 0.0,
    val type: TransactionType = TransactionType.EXPENSE,
    val status: TransactionStatus = TransactionStatus.PENDING,
    val unitName: String = "",
    val date: String = ""
)