package com.brontolano.albafintech.data.model

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

/**
 * Represents a financial unit within the pesantren (e.g., Kantor, Kantin, Koperasi).
 */
@JsonClass(generateAdapter = true)
data class Unit(
    @Json(name = "id") val id: Long = 0,
    @Json(name = "name") val name: String = "",
    @Json(name = "type") val type: String = "",
    @Json(name = "balance") val balance: Double = 0.0
)
