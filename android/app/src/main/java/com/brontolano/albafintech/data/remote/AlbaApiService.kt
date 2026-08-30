package com.brontolano.albafintech.data.remote

import com.brontolano.albafintech.data.model.AuthResponse
import com.brontolano.albafintech.data.model.DashboardStats
import com.brontolano.albafintech.data.model.DashboardResponse
import com.brontolano.albafintech.data.model.PaginatedResponse
import com.brontolano.albafintech.data.model.Transaction
import com.brontolano.albafintech.data.model.TransactionRequest
import com.brontolano.albafintech.data.model.TransactionResponse
import com.brontolano.albafintech.data.model.TransactionStatus
import com.brontolano.albafintech.data.model.Unit as UnitModel
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.Field
import retrofit2.http.FormUrlEncoded
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * API service interface for all Alba Finance backend endpoints.
 */
interface AlbaApiService {

    // ---- Auth ----

    @FormUrlEncoded
    @POST("api/auth/login")
    suspend fun login(
        @Field("username") username: String,
        @Field("password") password: String
    ): Response<AuthResponse>

    // ---- Dashboard ----

    @GET("api/dashboard/stats")
    suspend fun getDashboardStats(
        @Query("role") role: String,
        @Query("unit_id") unitId: Long? = null
    ): Response<DashboardResponse>

    // ---- Units ----

    @GET("api/units")
    suspend fun getUnits(): Response<List<UnitModel>>

    // ---- Transactions ----

    @GET("api/transactions")
    suspend fun getTransactions(
        @Query("status") status: String? = null,
        @Query("type") type: String? = null,
        @Query("unit_id") unitId: Long? = null,
        @Query("start_date") startDate: String? = null,
        @Query("end_date") endDate: String? = null,
        @Query("search") search: String? = null,
        @Query("page") page: Int = 1,
        @Query("per_page") perPage: Int = 20
    ): Response<PaginatedResponse<Transaction>>

    @GET("api/transactions/{id}")
    suspend fun getTransactionDetail(
        @Path("id") id: Long
    ): Response<TransactionResponse>

    @POST("api/transactions")
    suspend fun createTransaction(
        @Body request: TransactionRequest
    ): Response<TransactionResponse>

    @PUT("api/transactions/{id}")
    suspend fun updateTransaction(
        @Path("id") id: Long,
        @Body request: TransactionRequest
    ): Response<TransactionResponse>

    @DELETE("api/transactions/{id}")
    suspend fun deleteTransaction(
        @Path("id") id: Long
    ): Response<Unit>
}
