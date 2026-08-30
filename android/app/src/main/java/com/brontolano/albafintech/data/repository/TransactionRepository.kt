@file:Suppress("unused")

package com.brontolano.albafintech.data.repository

import com.brontolano.albafintech.data.model.DashboardResponse
import com.brontolano.albafintech.data.model.DashboardStats
import com.brontolano.albafintech.data.model.PaginatedResponse
import com.brontolano.albafintech.data.model.Transaction
import com.brontolano.albafintech.data.model.TransactionRequest
import com.brontolano.albafintech.data.model.TransactionResponse
import com.brontolano.albafintech.data.model.TransactionStatus
import com.brontolano.albafintech.data.model.Unit as UnitModel
import com.brontolano.albafintech.data.model.UserRole
import com.brontolano.albafintech.data.model.Result
import com.brontolano.albafintech.data.remote.AlbaApiService
import kotlinx.coroutines.flow.Flow

/**
 * Repository for transaction and dashboard operations.
 * Uses [AlbaApiService] for all network calls and wraps results in [Result].
 */
class TransactionRepository(
    private val apiService: AlbaApiService
) {

    // ---- Dashboard ----

    suspend fun getDashboardStats(
        role: UserRole,
        unitId: Long? = null
    ): Result<DashboardStats> {
        return try {
            val response = apiService.getDashboardStats(
                role = role.name,
                unitId = unitId
            )
            if (response.isSuccessful) {
                val body = response.body()
                if (body != null && body.data != null) {
                    Result.Success(body.data)
                } else {
                    val empty = DashboardStats()
                    Result.Success(empty)
                }
            } else {
                Result.Error(
                    message = "Failed to load dashboard stats: ${response.message()}",
                    code = response.code()
                )
            }
        } catch (e: Exception) {
            Result.Error("Network error: ${e.localizedMessage}")
        }
    }

    /**
     * Fetches the list of units from GET /api/units.
     * Returns [Result.Success] with the unit list, or [Result.Error] on failure.
     */
    suspend fun getUnits(): Result<List<UnitModel>> {
        return try {
            val response = apiService.getUnits()
            if (response.isSuccessful) {
                val body = response.body()
                Result.Success(body ?: emptyList())
            } else {
                Result.Error(
                    message = "Failed to load units: ${'$'}{response.message()}",
                    code = response.code()
                )
            }
        } catch (e: Exception) {
            Result.Error("Network error: ${'$'}{e.localizedMessage}")
        }
    }

    // ---- Transactions ----

    suspend fun getTransactions(
        status: TransactionStatus? = null,
        type: String? = null,
        unitId: Long? = null,
        startDate: String? = null,
        endDate: String? = null,
        search: String? = null,
        page: Int = 1,
        perPage: Int = 20
    ): Result<PaginatedResponse<Transaction>> {
        return try {
            val response = apiService.getTransactions(
                status = status?.name,
                type = type,
                unitId = unitId,
                startDate = startDate,
                endDate = endDate,
                search = search,
                page = page,
                perPage = perPage
            )
            if (response.isSuccessful) {
                val body = response.body()
                if (body != null) {
                    Result.Success(body)
                } else {
                    Result.Success(PaginatedResponse())
                }
            } else {
                Result.Error(
                    message = "Failed to load transactions: ${response.message()}",
                    code = response.code()
                )
            }
        } catch (e: Exception) {
            Result.Error("Network error: ${e.localizedMessage}")
        }
    }

    suspend fun getTransactionDetail(id: Long): Result<Transaction> {
        return try {
            val response = apiService.getTransactionDetail(id = id)
            if (response.isSuccessful) {
                val body = response.body()
                if (body != null && body.data != null) {
                    Result.Success(body.data)
                } else {
                    Result.Error(body?.message ?: "Transaction data not found")
                }
            } else {
                Result.Error(
                    message = "Failed to load transaction: ${response.message()}",
                    code = response.code()
                )
            }
        } catch (e: Exception) {
            Result.Error("Network error: ${e.localizedMessage}")
        }
    }

    suspend fun createTransaction(request: TransactionRequest): Result<Transaction> {
        return try {
            val response = apiService.createTransaction(request)
            if (response.isSuccessful) {
                val body = response.body()
                if (body != null && body.data != null) {
                    Result.Success(body.data)
                } else {
                    Result.Error("Create transaction failed: ${'$'}{body?.message ?: response.message()}")
                }
            } else {
                Result.Error(
                    message = "Create transaction failed: ${response.message()}",
                    code = response.code()
                )
            }
        } catch (e: Exception) {
            Result.Error("Network error: ${e.localizedMessage}")
        }
    }

    suspend fun updateTransaction(id: Long, request: TransactionRequest): Result<Transaction> {
        return try {
            val response = apiService.updateTransaction(id = id, request = request)
            if (response.isSuccessful) {
                val body = response.body()
                if (body != null && body.data != null) {
                    Result.Success(body.data)
                } else {
                    Result.Error(body?.message ?: "Update transaction failed: invalid response")
                }
            } else {
                Result.Error(
                    message = "Update transaction failed: ${response.message()}",
                    code = response.code()
                )
            }
        } catch (e: Exception) {
            Result.Error("Network error: ${e.localizedMessage}")
        }
    }

    suspend fun deleteTransaction(id: Long): Result<Unit> {
        return try {
            val response = apiService.deleteTransaction(id = id)
            if (response.isSuccessful) {
                Result.Success(Unit)
            } else {
                Result.Error(
                    message = "Delete transaction failed: ${response.message()}",
                    code = response.code()
                )
            }
        } catch (e: Exception) {
            Result.Error("Network error: ${e.localizedMessage}")
        }
    }
}