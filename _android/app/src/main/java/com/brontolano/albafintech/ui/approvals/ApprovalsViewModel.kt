package com.brontolano.albafintech.ui.approvals

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.brontolano.albafintech.data.model.Result
import com.brontolano.albafintech.data.model.Transaction
import com.brontolano.albafintech.data.model.PaginatedResponse
import com.brontolano.albafintech.data.model.TransactionStatus
import com.brontolano.albafintech.data.repository.TransactionRepository
import com.brontolano.albafintech.ui.navigation.AppContainer
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ApprovalsUiState(
    val transactions: List<com.brontolano.albafintech.data.model.Transaction> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val currentPage: Int = 1,
    val lastPage: Int = 1,
    val hasNextPage: Boolean = true
)

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
            _uiState.update { it.copy(isLoading = true) }
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
            !_uiState.value.isLoading) {
            loadApprovals(reset = false)
        }
    }

    fun approveTransaction(id: Long) {
        viewModelScope.launch {
            // TODO: Implement approval API call
        }
    }

    fun rejectTransaction(id: Long) {
        viewModelScope.launch {
            // TODO: Implement rejection API call
        }
    }
}