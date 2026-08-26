package com.brontolano.albafintech.data.remote

import com.brontolano.albafintech.data.models.AuthResponse
import com.brontolano.albafintech.data.models.Unit
import com.brontolano.albafintech.data.models.Transaction
import com.brontolano.albafintech.data.models.Approval
import com.brontolano.albafintech.data.models.Lembaga
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * Native Android API interface — shares the SAME MySQL database as web app
 * via NextAuth session cookies. Auth flow mirrors webapps: POST to /api/auth
 * to receive JWT access token, then use as Bearer token for subsequent requests.
 */
interface ApiService {

    // === AUTH (NextAuth session based) ===
    @POST("api/auth/signin")
    suspend fun login(@Body credentials: Map<String, String>): AuthResponse

    @POST("api/auth/signout")
    suspend fun logout(@Header("Authorization") token: String)

    // === UNITS (linked to Lembaga) ===
    @GET("api/units")
    suspend fun getUnits(@Header("Authorization") token: String): List<Unit>

    @GET("api/units/{id}")
    suspend fun getUnit(@Header("Authorization") token: String, @Path("id") unitId: String): Unit

    // === TRANSACTIONS ===
    @GET("api/transactions")
    suspend fun getTransactions(@Header("Authorization") token: String, @Query("status") status: String? = null): List<Transaction>

    @POST("api/transactions")
    suspend fun createTransaction(@Header("Authorization") token: String, @Body tx: Transaction): Transaction

    // === APPROVALS (Manager/Pimpinan workflow) ===
    @GET("api/approvals")
    suspend fun getApprovals(@Header("Authorization") token: String): List<Approval>

    @POST("api/approvals/{id}/approve")
    suspend fun approveTransaction(@Header("Authorization") token: String, @Path("id") approvalId: String): Approval

    // === LEMBARAN (Lembaga hierarchy) ===
    @GET("api/lembaga")
    suspend fun getLembagas(@Header("Authorization") token: String): List<Lembaga>
}
