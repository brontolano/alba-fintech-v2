package com.brontolano.albafintech.data.repository

import com.brontolano.albafintech.data.model.CompanyUnit
import com.brontolano.albafintech.data.model.CreateTransactionRequest
import com.brontolano.albafintech.data.model.PaginatedMeta
import com.brontolano.albafintech.data.model.PaginatedResponse
import com.brontolano.albafintech.data.model.Result
import com.brontolano.albafintech.data.model.Transaction
import com.brontolano.albafintech.data.model.TransactionFilter
import com.brontolano.albafintech.data.model.TransactionStatus
import com.brontolano.albafintech.data.model.TransactionType
import com.brontolano.albafintech.data.model.UpdateTransactionRequest
import kotlinx.coroutines.delay

/**
 * Mock implementation of TransactionRepository for demonstration.
 * In a real app, this would use Retrofit/Room to communicate with backend/database.
 */
class MockTransactionRepository : TransactionRepository {

    private val sampleTransactions = listOf(
        Transaction(1, "Office Supplies", 250000.0, TransactionType.EXPENSE, TransactionStatus.APPROVED, 1, "HQ - Jakarta", null, "Office", "2024-01-15T00:00:00Z", "2024-01-15T10:30:00Z", "admin"),
        Transaction(2, "Client Payment - ABC Corp", 15000000.0, TransactionType.INCOME, TransactionStatus.APPROVED, 1, "HQ - Jakarta", null, "Revenue", "2024-01-14T00:00:00Z", "2024-01-14T15:00:00Z", "sales"),
        Transaction(3, "Utility Bill - Electricity", 500000.0, TransactionType.EXPENSE, TransactionStatus.PENDING, 2, "HQ - Bandung", null, "Utilities", "2024-01-13T00:00:00Z", "2024-01-13T09:00:00Z", "admin"),
        Transaction(4, "Website Subscription", 120000.0, TransactionType.EXPENSE, TransactionStatus.DRAFT, 1, "HQ - Jakarta", null, "Software", "2024-01-10T00:00:00Z", "2024-01-10T08:00:00Z", "admin"),
        Transaction(5, "Product Sales - X-Men", 8500000.0, TransactionType.INCOME, TransactionStatus.APPROVED, 3, "Branch - Surabaya", null, "Sales", "2024-01-09T00:00:00Z", "2024-01-09T11:30:00Z", "sales"),
        Transaction(6, "Office Rent", 30000000.0, TransactionType.EXPENSE, TransactionStatus.REJECTED, 1, "HQ - Jakarta", null, "Facilities", "2024-01-08T00:00:00Z", "2024-01-08T14:00:00Z", "admin"),
        Transaction(7, "Consulting Services", 5000000.0, TransactionType.INCOME, TransactionStatus.PENDING, 4, "Branch - Medan", null, "Services", "2024-01-07T00:00:00Z", "2024-01-07T10:00:00Z", "sales"),
        Transaction(8, "Marketing Campaign", 750000.0, TransactionType.EXPENSE, TransactionStatus.APPROVED, 1, "HQ - Jakarta", null, "Marketing", "2024-01-06T00:00:00Z", "2024-01-06T09:30:00Z", "admin"),
    )

    private val sampleUnits = listOf(
        CompanyUnit(1, "HQ - Jakarta", "JKT"),
        CompanyUnit(2, "HQ - Bandung", "BDG"),
        CompanyUnit(3, "Branch - Surabaya", "SUB"),
        CompanyUnit(4, "Branch - Medan", "MDN"),
    )

    override suspend fun getTransactions(
        filter: TransactionFilter?,
        status: TransactionStatus?,
        unitId: Long?,
        dateFrom: String?,
        dateTo: String?,
        page: Int,
        perPage: Int
    ): Result<PaginatedResponse<Transaction>> {
        delay(500) // Simulate network delay

        var filtered = sampleTransactions

        if (status != null) {
            filtered = filtered.filter { it.status == status }
        }
        if (unitId != null) {
            filtered = filtered.filter { it.unitId == unitId }
        }
        if (dateFrom != null) {
            filtered = filtered.filter { it.date >= dateFrom }
        }
        if (dateTo != null) {
            filtered = filtered.filter { it.date <= dateTo }
        }

        val startIndex = (page - 1) * perPage
        val paged = filtered.drop(startIndex).take(perPage)

        return Result.Success(PaginatedResponse(
            data = paged,
            meta = PaginatedMeta(
                current = page,
                lastPage = (filtered.size + perPage - 1) / perPage,
                perPage = perPage,
                total = filtered.size
            )
        ))
    }

    override suspend fun getTransactionById(id: Long): Result<Transaction> {
        delay(300)
        val transaction = sampleTransactions.find { it.id == id }
        return if (transaction != null) {
            Result.Success(transaction)
        } else {
            Result.Error("Transaction with id $id not found")
        }
    }

    override suspend fun createTransaction(request: CreateTransactionRequest): Result<Transaction> {
        delay(800)
        val newId = (sampleTransactions.maxOfOrNull { it.id } ?: 0L) + 1
        val newTransaction = Transaction(
            id = newId,
            description = request.description,
            amount = request.amount,
            type = request.type,
            status = request.status,
            unitId = request.unitId,
            unitName = sampleUnits.find { it.id == request.unitId }?.name ?: "",
            date = request.date ?: "",
            createdAt = "",
            updatedAt = "",
            createdBy = "current_user"
        )
        return Result.Success(newTransaction)
    }

    override suspend fun updateTransaction(id: Long, request: UpdateTransactionRequest): Result<Transaction> {
        delay(600)
        val existing = sampleTransactions.find { it.id == id }
        return if (existing != null) {
            val updated = existing.copy(
                description = request.description,
                amount = request.amount,
                type = request.type,
                status = request.status,
                unitId = request.unitId,
                unitName = sampleUnits.find { it.id == request.unitId }?.name ?: "",
                date = request.date ?: existing.date,
                updatedAt = ""
            )
            Result.Success(updated)
        } else {
            Result.Error("Transaction with id $id not found")
        }
    }

    override suspend fun deleteTransaction(id: Long): Result<Unit> {
        delay(500)
        // Return Success with Unit - using explicit type annotation to help type inference
        val successResult: Result<Unit> = Result.Success(Unit)
        return successResult
    }

    override suspend fun getUnits(): Result<List<CompanyUnit>> {
        delay(200)
        return Result.Success(sampleUnits)
    }
}

/**
 * AppContainer provides singleton instances of repositories.
 */
object AppContainer {
    private var _transactionRepository: TransactionRepository? = null

    fun getTransactionRepository(): TransactionRepository {
        return _transactionRepository ?: MockTransactionRepository().also {
            _transactionRepository = it
        }
    }

    fun reset() {
        _transactionRepository = null
    }
}