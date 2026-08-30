package com.brontolano.albafintech.data.repository

import com.brontolano.albafintech.data.model.CompanyUnit
import com.brontolano.albafintech.data.model.CreateTransactionRequest
import com.brontolano.albafintech.data.model.PaginatedResponse
import com.brontolano.albafintech.data.model.Result
import com.brontolano.albafintech.data.model.Transaction
import com.brontolano.albafintech.data.model.TransactionFilter
import com.brontolano.albafintech.data.model.TransactionStatus
import com.brontolano.albafintech.data.model.UpdateTransactionRequest

/**
 * Repository for handling transaction data.
 */
interface TransactionRepository {
    suspend fun getTransactions(
        filter: TransactionFilter? = null,
        status: TransactionStatus? = null,
        unitId: Long? = null,
        dateFrom: String? = null,
        dateTo: String? = null,
        page: Int = 1,
        perPage: Int = 20
    ): Result<PaginatedResponse<Transaction>>

    suspend fun getTransactionById(id: Long): Result<Transaction>

    suspend fun createTransaction(request: CreateTransactionRequest): Result<Transaction>

    suspend fun updateTransaction(id: Long, request: UpdateTransactionRequest): Result<Transaction>

    suspend fun deleteTransaction(id: Long): Result<Unit>

    suspend fun getUnits(): Result<List<CompanyUnit>>
}