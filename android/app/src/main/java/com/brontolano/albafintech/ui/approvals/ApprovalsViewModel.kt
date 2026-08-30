package com.brontolano.albafintech.ui.approvals

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.brontolano.albafintech.data.model.Result
import com.brontolano.albafintech.data.model.Transaction
import com.brontolano.albafintech.data.model.TransactionStatus
import com.brontolano.albafintech.data.repository.TransactionRepository
import com.brontolano.albafintech.ui.navigation.AppContainer
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * UI state for the approvals screen.
 */
data class ApprovalsUiState(
    val transactions: List<Transaction> = emptyList(),
    val isLoading: Boolean = false,
    val isLoadingMore: Boolean = false,
    val error: String? = null,
    val currentPage: Int = 1,
    val lastPage: Int = 1,
    val hasNextPage: Boolean = true
)

/**
 * ViewModel for the Approvals screen.
 *
 * Loads transactions with status [TransactionStatus.PENDING] so a manager or
 * pimpinan can review submissions awaiting their approval. Pagination mirrors
 * the transaction list (server-side).
 */
class ApprovalsViewModel(
    private val repository: TransactionRepository = AppContainer.getTransactionRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(ApprovalsUiState())
    val uiState: StateFlow<ApprovalsUiState> = _uiState.asStateFlow()

    fun loadApprovals(reset: Boolean = true) {
        val currentState = _uiState.value
        val page = if (reset) 1 else currentState.currentPage + 1

        if (reset) {
            _uiState.update { it.copy(isLoading = true, error = null, currentPage = 1) }
        } else {
            _uiState.update { it.copy(isLoadingMore = true, error = null) }
        }

        viewModelScope.launch {
            val result = repository.getTransactions(
                status = TransactionStatus.PENDING,
                page = page,
                perPage = 20
            )

            when (result) {
                is Result.Success -> {
                    val data = result.data
                    _uiState.update {
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
                    _uiState.update {
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
        if (_uiState.value.hasNextPage &&
            !_uiState.value.isLoading &&
            !_uiState.value.isLoadingMore
        ) {
            loadApprovals(reset = false)
        }
    }

    fun approveTransaction(id: Long) {
        viewModelScope.launch {
            // TODO: Implement approval API call (PUT /api/transactions/{id}/approve)
            // Once the backend endpoint exists, delegate to TransactionRepository
            // and optimistically refresh the pending list via loadApprovals(true).
        }
    }

    fun rejectTransaction(id: Long) {
        viewModelScope.launch {
            // TODO: Implement rejection API call (PUT /api/transactions/{id}/reject)
            // Once the backend endpoint exists, delegate to TransactionRepository
            // and optimistically refresh the pending list via loadApprovals(true).
        }
    }
}
