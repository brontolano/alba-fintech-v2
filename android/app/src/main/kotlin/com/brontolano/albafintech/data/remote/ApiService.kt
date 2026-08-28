package com.brontolano.albafintech.data.remote

import com.brontolano.albafintech.data.models.Account
import com.brontolano.albafintech.data.models.ApiResponse
import com.brontolano.albafintech.data.models.Approval
import com.brontolano.albafintech.data.models.ApproveRequest
import com.brontolano.albafintech.data.models.AuditLog
import com.brontolano.albafintech.data.models.AuthResponse
import com.brontolano.albafintech.data.models.CreateTransactionRequest
import com.brontolano.albafintech.data.models.Lembaga
import com.brontolano.albafintech.data.models.LoginRequest
import com.brontolano.albafintech.data.models.MessageResponse
import com.brontolano.albafintech.data.models.Unit as AppUnit
import com.brontolano.albafintech.data.models.Notification
import com.brontolano.albafintech.data.models.Transaction
import com.brontolano.albafintech.data.models.UpdateTransactionRequest
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * Native Android API interface — shares the SAME MySQL database as the web app
 * via existing Next.js API endpoints at https://alba.brontolano.com/api
 *
 * Authentication: POST to /api/mobile/auth/login to receive a NextAuth JWT token.
 * The token is sent as Cookie: next-auth.session-token=<token> for all subsequent
 * requests (handled automatically by [ApiClient.TokenInterceptor]).
 */
interface ApiService {

    // === AUTH (Mobile auth endpoint) ===

    @POST("api/mobile/auth/login")
    suspend fun login(@Body request: LoginRequest): AuthResponse

    @POST("api/mobile/auth/logout")
    suspend fun logout()

    // === UNITS ===

    @GET("api/units")
    suspend fun getUnits(): ApiResponse<List<AppUnit>>

    @GET("api/units/{id}")
    suspend fun getUnit(@Path("id") unitId: String): ApiResponse<AppUnit>

    // === TRANSACTIONS ===

    @GET("api/transactions")
    suspend fun getTransactions(
        @Query("status") status: String? = null,
        @Query("type") type: String? = null,
        @Query("limit") limit: Int? = null
    ): ApiResponse<List<Transaction>>

    @GET("api/transactions/{id}")
    suspend fun getTransaction(@Path("id") id: String): ApiResponse<Transaction>

    @POST("api/transactions")
    suspend fun createTransaction(@Body request: CreateTransactionRequest): ApiResponse<Transaction>

    @PATCH("api/transactions/{id}")
    suspend fun updateTransaction(
        @Path("id") id: String,
        @Body request: UpdateTransactionRequest
    ): ApiResponse<Transaction>

    // === APPROVALS ===

    @GET("api/approvals")
    suspend fun getApprovals(): ApiResponse<List<Approval>>

    @POST("api/approvals")
    suspend fun approveTransaction(@Body request: ApproveRequest): ApiResponse<Transaction>

    // === ACCOUNTS ===

    @GET("api/accounts")
    suspend fun getAccounts(): ApiResponse<List<Account>>

    // === LEMBARAN ===

    @GET("api/lembaga")
    suspend fun getLembagas(): ApiResponse<List<Lembaga>>

    // === NOTIFICATIONS ===

    @GET("api/notifications")
    suspend fun getNotifications(
        @Query("limit") limit: Int = 20,
        @Query("isRead") isRead: Boolean? = null
    ): ApiResponse<List<Notification>>

    @PATCH("api/notifications")
    suspend fun markAllRead(@Query("action") action: String = "markAllRead"): MessageResponse

    // === AUDIT LOG ===

    @GET("api/audit-logs")
    suspend fun getAuditLogs(
        @Query("limit") limit: Int = 50,
        @Query("entity") entity: String? = null
    ): ApiResponse<List<AuditLog>>
}
