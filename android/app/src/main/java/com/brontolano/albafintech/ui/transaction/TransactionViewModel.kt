package com.brontolano.albafintech.ui.transaction

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.brontolano.albafintech.data.model.Result
import com.brontolano.albafintech.data.model.Transaction
import com.brontolano.albafintech.data.model.TransactionRequest
import com.brontolano.albafintech.data.model.TransactionStatus
import com.brontolano.albafintech.data.model.PaginatedResponse
import com.brontolano.albafintech.data.repository.TransactionRepository
import com.brontolano.albafintech.ui.navigation.AppContainer
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class TransactionFilter(
    val status: TransactionStatus? = null,
    val type: String? = null,
    val unitId: Long? = null,
    val startDate: String? = null,
    val endDate: String? = null,
    val search: String? = null
)

data class TransactionListUiState(
    val transactions: List<Transaction> = emptyList(),
    val isLoading: Boolean = false,
    val isLoadingMore: Boolean = false,
    val isRefreshing: Boolean = false,
    val error: String? = null,
    val currentPage: Int = 1,
    val lastPage: Int = 1,
    val filters: TransactionFilter = TransactionFilter(),
    val hasNextPage: Boolean = true
)

sealed class TransactionEvent {
    data class ShowMessage(val message: String) : TransactionEvent()
    data class ShowTransactionDetail(val id: Long) : TransactionEvent()
    object NavigateBack : TransactionEvent()
}

class TransactionViewModel(
    private val repository: TransactionRepository = AppContainer.getTransactionRepository()
) : ViewModel() {

    private val _listUiState = MutableStateFlow(TransactionListUiState())
    val listUiState: StateFlow<TransactionListUiState> = _listUiState.asStateFlow()

    private val _detailUiState = MutableStateFlow<DetailUiState>(DetailUiState.Loading)
    val detailUiState: StateFlow<DetailUiState> = _detailUiState.asStateFlow()

    private val _eventFlow = MutableStateFlow<TransactionEvent?>(null)
    val eventFlow: StateFlow<TransactionEvent?> = _eventFlow.asStateFlow()

    // ---- List / Filter ----

    fun updateFilters(newFilters: TransactionFilter) {
        _listUiState.update {
            it.copy(
                filters = newFilters,
                transactions = emptyList(),
                currentPage = 1,
                lastPage = 1,
                hasNextPage = true,
                error = null
            )
        }
        loadTransactions(reset = true)
    }

    fun filterByStatus(status: TransactionStatus?) {
        val currentFilters = _listUiState.value.filters
        val newFilters = currentFilters.copy(status = status)
        updateFilters(newFilters)
    }

    fun filterByUnit(unitId: Long?) {
        val currentFilters = _listUiState.value.filters
        val newFilters = currentFilters.copy(unitId = unitId)
        updateFilters(newFilters)
    }

    fun filterByDateRange(startDate: String?, endDate: String?) {
        val currentFilters = _listUiState.value.filters
        val newFilters = currentFilters.copy(startDate = startDate, endDate = endDate)
        updateFilters(newFilters)
    }

    fun loadTransactions(reset: Boolean = true) {
        val currentState = _listUiState.value
        val page = if (reset) 1 else currentState.currentPage + 1

        if (reset) {
            _listUiState.update { it.copy(isLoading = true, error = null, currentPage = 1) }
        } else {
            _listUiState.update { it.copy(isLoadingMore = true, error = null) }
        }

        viewModelScope.launch {
            val result = repository.getTransactions(
                status = currentState.filters.status,
                type = currentState.filters.type,
                unitId = currentState.filters.unitId,
                startDate = currentState.filters.startDate,
                endDate = currentState.filters.endDate,
                search = currentState.filters.search,
                page = page,
                perPage = 20
            )

            when (result) {
                is Result.Success -> {
                    val data = result.data
                    _listUiState.update {
                        it.copy(
                            transactions = if (reset) data.data else it.transactions + data.data,
                            isLoading = false,
                            isLoadingMore = false,
                            currentPage = page,
                            lastPage = data.meta.lastPage,
                            hasNextPage = page < data.meta.lastPage,
                            error = null
                        )
                    }
                }
                is Result.Error -> {
                    _listUiState.update {
                        it.copy(
                            isLoading = false,
                            isLoadingMore = false,
                            error = result.message
                        )
                    }
                }
                is Result.Loading -> {}
            }
        }
    }

    fun loadMore() {
        if (_listUiState.value.hasNextPage &&
            !_listUiState.value.isLoading &&
            !_listUiState.value.isLoadingMore) {
            loadTransactions(reset = false)
        }
    }

    /**
     * Refresh the transaction list with current filters.
     * Used for pull-to-refresh functionality.
     */
    fun refresh() {
        _listUiState.update { it.copy(isRefreshing = true, error = null) }
        viewModelScope.launch {
            val currentState = _listUiState.value
            val result = repository.getTransactions(
                status = currentState.filters.status,
                type = currentState.filters.type,
                unitId = currentState.filters.unitId,
                startDate = currentState.filters.startDate,
                endDate = currentState.filters.endDate,
                search = currentState.filters.search,
                page = 1,
                perPage = 20
            )

            when (result) {
                is Result.Success -> {
                    val data = result.data
                    _listUiState.update {
                        it.copy(
                            transactions = data.data,
                            isLoading = false,
                            isLoadingMore = false,
                            isRefreshing = false,
                            currentPage = 1,
                            lastPage = data.meta.lastPage,
                            hasNextPage = 1 < data.meta.lastPage,
                            error = null
                        )
                    }
                }
                is Result.Error -> {
                    _listUiState.update {
                        it.copy(
                            isLoading = false,
                            isLoadingMore = false,
                            isRefreshing = false,
                            error = result.message
                        )
                    }
                }
                is Result.Loading -> {}
            }
        }
    }

    /**
     * Clear any error state.
     */
    fun clearError() {
        _listUiState.update { it.copy(error = null) }
    }

    // ---- Detail ----

    fun loadTransactionDetail(id: Long) {
        _detailUiState.value = DetailUiState.Loading
        viewModelScope.launch {
            val result = repository.getTransactionDetail(id)
            _detailUiState.value = when (result) {
                is Result.Success -> DetailUiState.Success(result.data)
                is Result.Error -> DetailUiState.Error(result.message)
                is Result.Loading -> DetailUiState.Loading
            }
        }
    }

    // ---- CRUD ----

    fun createTransaction(request: TransactionRequest) {
        viewModelScope.launch {
            _eventFlow.value = null
            val result = repository.createTransaction(request)
            when (result) {
                is Result.Success -> {
                    _eventFlow.value = TransactionEvent.ShowMessage("Transaksi berhasil dibuat")
                }
                is Result.Error -> {
                    _eventFlow.value = TransactionEvent.ShowMessage("Gagal membuat transaksi: ${result.message}")
                }
                is Result.Loading -> {}
            }
        }
    }

    fun updateTransaction(id: Long, request: TransactionRequest) {
        viewModelScope.launch {
            _eventFlow.value = null
            val result = repository.updateTransaction(id, request)
            when (result) {
                is Result.Success -> {
                    // Update succeeded: return to the previous screen.
                    _eventFlow.value = TransactionEvent.NavigateBack
                }
                is Result.Error -> {
                    _eventFlow.value = TransactionEvent.ShowMessage("Gagal memperbarui transaksi: ${result.message}")
                }
                is Result.Loading -> {}
            }
        }
    }

    fun deleteTransaction(id: Long) {
        viewModelScope.launch {
            _eventFlow.value = null
            val result = repository.deleteTransaction(id)
            when (result) {
                is Result.Success -> {
                    // Delete succeeded: return to the transaction list.
                    _eventFlow.value = TransactionEvent.NavigateBack
                }
                is Result.Error -> {
                    _eventFlow.value = TransactionEvent.ShowMessage("Gagal menghapus transaksi: ${result.message}")
                }
                is Result.Loading -> {}
            }
        }
    }

    fun clearEvent() {
        _eventFlow.value = null
    }
}

sealed interface DetailUiState {
    object Loading : DetailUiState
    data class Success(val transaction: Transaction) : DetailUiState
    data class Error(val message: String) : DetailUiState
}