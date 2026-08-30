package com.brontolano.albafintech.data.model

import kotlinx.serialization.Serializable

/**
 * Transaction status enumeration.
 */
@Serializable
enum class TransactionStatus {
    PENDING,
    APPROVED,
    REJECTED,
    DRAFT
}

/**
 * Transaction type enumeration.
 */
@Serializable
enum class TransactionType {
    INCOME,
    EXPENSE
}

/**
 * User role enumeration.
 */
@Serializable
enum class UserRole(val displayName: String) {
    SUPERADMIN("Super Admin"),
    PIMPINAN("Pimpinan"),
    MANAGER("Manager"),
    STAFF("Staff")
}