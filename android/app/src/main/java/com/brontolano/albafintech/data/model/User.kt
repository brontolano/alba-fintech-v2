package com.brontolano.albafintech.data.model

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

/**
 * Represents the role of a user in the system.
 * - SUPERADMIN: Full overview + unit breakdown
 * - PIMPINAN: Executive summary
 * - MANAGER: Unit-specific stats
 * - STAFF: Personal submission summary
 */
enum class UserRole {
    @Json(name = "SUPERADMIN") SUPERADMIN,
    @Json(name = "PIMPINAN") PIMPINAN,
    @Json(name = "MANAGER") MANAGER,
    @Json(name = "STAFF") STAFF
}

/**
 * Represents an authenticated user.
 */
@JsonClass(generateAdapter = true)
data class User(
    @Json(name = "id") val id: Long = 0,
    @Json(name = "username") val username: String = "",
    @Json(name = "name") val name: String = "",
    @Json(name = "role") val role: UserRole = UserRole.STAFF,
    @Json(name = "unit_id") val unitId: Long? = null,
    @Json(name = "unit_name") val unitName: String? = null
)

/**
 * Request body for login API call.
 */
@JsonClass(generateAdapter = true)
data class LoginRequest(
    @Json(name = "username") val username: String,
    @Json(name = "password") val password: String
)

/**
 * Response from the login API.
 */
@JsonClass(generateAdapter = true)
data class AuthResponse(
    @Json(name = "success") val success: Boolean = false,
    @Json(name = "token") val token: String? = null,
    @Json(name = "user") val user: User? = null,
    @Json(name = "message") val message: String? = null
)
