package com.brontolano.albafintech.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Pagination metadata.
 */
@Serializable
data class PaginatedMeta(
    val current: Int = 1,
    val lastPage: Int = 1,
    val perPage: Int = 20,
    val total: Int = 0
)

/**
 * Paginated response wrapper.
 */
@Serializable
data class PaginatedResponse<T>(
    val data: List<T> = emptyList(),
    val meta: PaginatedMeta = PaginatedMeta()
)