package com.brontolano.albafintech.data.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class AuthResponse(
    @SerialName("accessToken") val accessToken: String,
    @SerialName("refreshToken") val refreshToken: String? = null,
    @SerialName("user") val user: User?,
    @SerialName("error") val error: String? = null
)

@Serializable
data class User(
    @SerialName("id") val id: String,
    @SerialName("name") val name: String,
    @SerialName("email") val email: String,
    @SerialName("role") val role: String,
    @SerialName("unitId") val unitId: String? = null,
    @SerialName("lembagaId") val lembagaId: String? = null
)

@Serializable
data class Unit(
    @SerialName("id") val id: String,
    @SerialName("name") val name: String,
    @SerialName("code") val code: String,
    @SerialName("lembagaId") val lembagaId: String? = null,
    @SerialName("isActive") val isActive: Boolean
)

@Serializable
data class Transaction(
    @SerialName("id") val id: String,
    @SerialName("amount") val amount: Double,
    @SerialName("description") val description: String,
    @SerialName("status") val status: String,
    @SerialName("date") val date: String,
    @SerialName("unitId") val unitId: String,
    @SerialName("lembagaId") val lembagaId: String? = null,
    @SerialName("createdById") val createdById: String
)

@Serializable
data class Approval(
    @SerialName("id") val id: String,
    @SerialName("transactionId") val transactionId: String,
    @SerialName("transaction") val transaction: Transaction? = null,
    @SerialName("status") val status: String,
    @SerialName("approverId") val approverId: String? = null,
    @SerialName("createdAt") val createdAt: String,
    @SerialName("notes") val notes: String? = null
)

@Serializable
data class Lembaga(
    @SerialName("id") val id: String,
    @SerialName("name") val name: String,
    @SerialName("code") val code: String? = null,
    @SerialName("description") val description: String? = null,
    @SerialName("isActive") val isActive: Boolean,
    @SerialName("unitCount") val unitCount: Int = 0,
    @SerialName("userCount") val userCount: Int = 0
)
