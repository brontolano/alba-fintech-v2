package com.brontolano.albafintech.ui.navigation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.brontolano.albafintech.data.model.CompanyUnit
import com.brontolano.albafintech.data.model.Result
import com.brontolano.albafintech.data.model.Transaction
import com.brontolano.albafintech.data.model.TransactionFilter
import com.brontolano.albafintech.data.model.TransactionStatus
import com.brontolano.albafintech.data.model.TransactionType
import com.brontolano.albafintech.data.repository.AppContainer
import com.brontolano.albafintech.data.repository.TransactionRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Transaction state for the TransactionViewModel.
 */
data class TransactionState(
    val transactions: List<Transaction> = emptyList(),
    val isLoading: Boolean = false,
    val isLoadingMore: Boolean = false,
    val isRefreshing: Boolean = false,
    val error: String? = null,
    val filters: TransactionFilter = TransactionFilter(),
    val currentPage: Int = 1,
    val lastPage: Int = 1,
    val hasNextPage: Boolean = false,
    val selectedTransaction: Transaction? = null
)

/**
 * Form state for creating/editing transactions.
 */
data class TransactionFormState(
    val description: String = "",
    val amount: String = "",
    val type: TransactionType = TransactionType.EXPENSE,
    val unitId: Long = 0,
    val units: List<CompanyUnit> = emptyList(),
    val isLoadingUnits: Boolean = false,
    val validationError: String? = null,
    val isSubmitting: Boolean = false
)

class TransactionViewModel(
    private val repository: TransactionRepository = AppContainer.getTransactionRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(TransactionState())
    val uiState: StateFlow<TransactionState> = _uiState.asStateFlow()

    private val _formState = MutableStateFlow(TransactionFormState())
    val formState: StateFlow<TransactionFormState> = _formState.asStateFlow()

    // MARK: - CRUD Functions

    /**
     * Load transactions with current filters.
     */
    fun loadTransactions() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            val result = repository.getTransactions(
                status = _uiState.value.filters.status,
                unitId = _uiState.value.filters.unitId,
                dateFrom = _uiState.value.filters.dateFrom,
                dateTo = _uiState.value.filters.dateTo,
                page = 1,
                perPage = 20
            )

            when (result) {
                is Result.Success -> {
                    _uiState.update {
                        it.copy(
                            transactions = result.data.data,
                            isLoading = false,
                            currentPage = result.data.meta.current,
                            lastPage = result.data.meta.lastPage,
                            hasNextPage = result.data.meta.current < result.data.meta.lastPage,
                            error = null
                        )
                    }
                }
                is Result.Error -> {
                    _uiState.update {
                        it.copy(isLoading = false, error = result.message)
                    }
                }
                is Result.Loading -> {}
            }
        }
    }

    /**
     * Refresh transactions (reloads from first page).
     */
    fun refresh() {
        viewModelScope.launch {
            _uiState.update { it.copy(isRefreshing = true, error = null) }

            val result = repository.getTransactions(
                status = _uiState.value.filters.status,
                unitId = _uiState.value.filters.unitId,
                dateFrom = _uiState.value.filters.dateFrom,
                dateTo = _uiState.value.filters.dateTo,
                page = 1,
                perPage = 20
            )

            when (result) {
                is Result.Success -> {
                    _uiState.update {
                        it.copy(
                            transactions = result.data.data,
                            isRefreshing = false,
                            currentPage = result.data.meta.current,
                            lastPage = result.data.meta.lastPage,
                            hasNextPage = result.data.meta.current < result.data.meta.lastPage
                        )
                    }
                }
                is Result.Error -> {
                    _uiState.update {
                        it.copy(isRefreshing = false, error = result.message)
                    }
                }
                is Result.Loading -> {}
            }
        }
    }

    /**
     * Load next page if available.
     */
    fun loadMore() {
        if (_uiState.value.hasNextPage && !_uiState.value.isLoading && !_uiState.value.isRefreshing) {
            viewModelScope.launch {
                _uiState.update { it.copy(isLoadingMore = true) }

                val result = repository.getTransactions(
                    status = _uiState.value.filters.status,
                    unitId = _uiState.value.filters.unitId,
                    dateFrom = _uiState.value.filters.dateFrom,
                    dateTo = _uiState.value.filters.dateTo,
                    page = _uiState.value.currentPage + 1,
                    perPage = 20
                )

                when (result) {
                    is Result.Success -> {
                        _uiState.update {
                            it.copy(
                                transactions = it.transactions + result.data.data,
                                isLoadingMore = false,
                                currentPage = result.data.meta.current,
                                lastPage = result.data.meta.lastPage,
                                hasNextPage = result.data.meta.current < result.data.meta.lastPage
                            )
                        }
                    }
                    is Result.Error -> {
                        _uiState.update {
                            it.copy(isLoadingMore = false, error = result.message)
                        }
                    }
                    is Result.Loading -> {}
                }
            }
        }
    }

    /**
     * Filter transactions by status.
     */
    fun filterByStatus(status: TransactionStatus?) {
        _uiState.update { it.copy(filters = it.filters.copy(status = status)) }
        loadTransactions()
    }

    /**
     * Filter transactions by unit ID.
     */
    fun filterByUnit(unitId: Long?) {
        _uiState.update { it.copy(filters = it.filters.copy(unitId = unitId)) }
        loadTransactions()
    }

    /**
     * Filter transactions by date range.
     */
    fun filterByDateRange(dateFrom: String?, dateTo: String?) {
        _uiState.update { it.copy(filters = it.filters.copy(dateFrom = dateFrom, dateTo = dateTo)) }
        loadTransactions()
    }

    /**
     * Get transaction detail by ID.
     */
    suspend fun getTransactionDetail(id: Long): Transaction? {
        val result = repository.getTransactionById(id)
        return when (result) {
            is Result.Success -> result.data
            is Result.Error -> null
            is Result.Loading -> null
        }
    }

    // MARK: - Write Operations

    /**
     * Create a new transaction.
     */
    fun createTransaction(
        description: String,
        amount: Double,
        type: TransactionType,
        unitId: Long,
        categoryId: Long? = null
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            val result = repository.createTransaction(
                com.brontolano.albafintech.data.model.CreateTransactionRequest(
                    description = description,
                    amount = amount,
                    type = type,
                    unitId = unitId,
                    categoryId = categoryId
                )
            )
            _uiState.update { it.copy(isLoading = false) }
        }
    }

    /**
     * Update an existing transaction.
     */
    fun updateTransaction(
        id: Long,
        description: String,
        amount: Double,
        type: TransactionType,
        unitId: Long,
        categoryId: Long? = null
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            val result = repository.updateTransaction(
                id,
                com.brontolano.albafintech.data.model.UpdateTransactionRequest(
                    id = id,
                    description = description,
                    amount = amount,
                    type = type,
                    unitId = unitId,
                    categoryId = categoryId
                )
            )
            _uiState.update { it.copy(isLoading = false) }
        }
    }

    /**
     * Delete a transaction.
     */
    fun deleteTransaction(id: Long) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            repository.deleteTransaction(id)
            _uiState.update { it.copy(isLoading = false) }
        }
    }

    // MARK: - Form Management

    /**
     * Load available units for the dropdown.
     */
    fun loadUnits() {
        viewModelScope.launch {
            _formState.update { it.copy(isLoadingUnits = true) }
            val result = repository.getUnits()
            when (result) {
                is Result.Success -> {
                    _formState.update { it.copy(units = result.data, isLoadingUnits = false) }
                }
                is Result.Error -> {
                    _formState.update { it.copy(isLoadingUnits = false) }
                }
                is Result.Loading -> {}
            }
        }
    }

    /**
     * Validate the transaction form.
     * Returns true if valid, false otherwise.
     */
    fun validateForm(): Boolean {
        val state = _formState.value
        return when {
            state.description.isBlank() -> {
                _formState.update { it.copy(validationError = "Description is required") }
                false
            }
            state.amount.isBlank() -> {
                _formState.update { it.copy(validationError = "Amount is required") }
                false
            }
            state.unitId == 0L -> {
                _formState.update { it.copy(validationError = "Unit is required") }
                false
            }
            else -> {
                _formState.update { it.copy(validationError = null) }
                true
            }
        }
    }

    /**
     * Submit the transaction form.
     */
    fun submitTransaction() {
        if (!validateForm()) return

        val amountDouble = _formState.value.amount.toDoubleOrNull() ?: return
        
        viewModelScope.launch {
            _formState.update { it.copy(isSubmitting = true, validationError = null) }
            // Call create transaction
            createTransaction(
                description = _formState.value.description,
                amount = amountDouble,
                type = _formState.value.type,
                unitId = _formState.value.unitId
            )
            _formState.update { it.copy(isSubmitting = false) }
        }
    }

    // Helper to clear form after successful creation
    fun clearForm() {
        _formState.update { 
            it.copy(
                description = "",
                amount = "",
                type = TransactionType.EXPENSE,
                unitId = 0,
                isSubmitting = false
            )
        }
    }
}