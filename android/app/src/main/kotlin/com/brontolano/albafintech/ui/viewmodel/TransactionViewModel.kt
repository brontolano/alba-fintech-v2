package com.brontolano.albafintech.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.brontolano.albafintech.R
import com.brontolano.albafintech.data.models.CreateTransactionRequest
import com.brontolano.albafintech.data.models.Transaction
import com.brontolano.albafintech.data.remote.ApiClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class TransactionViewModel(application: Application) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(TransactionUiState())
    val uiState: StateFlow<TransactionUiState> = _uiState

    // Alias for backward compatibility with existing screens (e.g. ReportsScreen)
    val listState: StateFlow<TransactionUiState> = _uiState

    // Separate state for create transaction flow
    private val _createState = MutableStateFlow(CreateTransactionUiState())
    val createState: StateFlow<CreateTransactionUiState> = _createState


    fun loadTransactions(status: String? = null, type: String? = null) {
        val currentState = _uiState.value
        if (currentState.isLoading && !currentState.transactions.isNullOrEmpty()) return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val api = ApiClient.getClient(getApplication())
                val response = api.getTransactions(status = status, type = type)
                val txList = response.data ?: emptyList()
                _uiState.value = TransactionUiState(
                    transactions = txList,
                    isLoading = false,
                    error = response.error
                )
            } catch (e: Exception) {
                _uiState.value = TransactionUiState(
                    transactions = emptyList(),
                    isLoading = false,
                    sessionExpired = true,
                    error = e.message ?: getApplication<Application>().getString(R.string.error_network)
                )
            }
        }
    }

    fun getTransaction(id: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null, transactionDetail = null)
            try {
                val api = ApiClient.getClient(getApplication())
                val response = api.getTransaction(id)
                _uiState.value = _uiState.value.copy(
                    transactionDetail = response.data,
                    isLoading = false,
                    error = response.error
                )
            } catch (e: Exception) {
                _uiState.value = TransactionUiState(
                    isLoading = false,
                    error = e.message ?: getApplication<Application>().getString(R.string.error_network)
                )
            }
        }
    }

    fun createTransaction(request: CreateTransactionRequest) {
        viewModelScope.launch {
            _createState.value = CreateTransactionUiState(isLoading = true, error = null, success = false)
            try {
                val api = ApiClient.getClient(getApplication())
                val response = api.createTransaction(request)
                if (response.data != null) {
                    loadTransactions()
                    _createState.value = CreateTransactionUiState(
                        isLoading = false,
                        success = true
                    )
                } else {
                    _createState.value = CreateTransactionUiState(
                        isLoading = false,
                        error = response.error ?: "Gagal menyimpan transaksi"
                    )
                }
            } catch (e: Exception) {
                _createState.value = CreateTransactionUiState(
                    isLoading = false,
                    error = e.message ?: getApplication<Application>().getString(R.string.error_network)
                )
            }
        }
    }

    fun clearCreateState() {
        _createState.value = CreateTransactionUiState()
    }

    data class TransactionUiState(
        val transactions: List<Transaction> = emptyList(),
        val transactionDetail: Transaction? = null,
        val isLoading: Boolean = false,
        val isSubmitting: Boolean = false,
        val submitSuccess: Boolean = false,
        val sessionExpired: Boolean = false,
        val error: String? = null,
        val submitError: String? = null
    )

    data class CreateTransactionUiState(
        val isLoading: Boolean = false,
        val success: Boolean = false,
        val error: String? = null
    )
}
