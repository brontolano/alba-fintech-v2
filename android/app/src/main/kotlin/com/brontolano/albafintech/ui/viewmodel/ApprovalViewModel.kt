package com.brontolano.albafintech.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.brontolano.albafintech.data.models.Approval
import com.brontolano.albafintech.data.models.ApproveRequest
import com.brontolano.albafintech.data.models.Transaction
import com.brontolano.albafintech.data.remote.ApiClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

/**
 * Sealed class representing the state of an approval/reject action.
 * Used by [ApprovalViewModel] and observed by [com.brontolano.albafintech.ui.screens.ApprovalListScreen].
 */
sealed class ApprovalActionUiState {
    object Idle : ApprovalActionUiState()
    object Loading : ApprovalActionUiState()
    data class Success(val transaction: Transaction) : ApprovalActionUiState()
    data class Error(val message: String) : ApprovalActionUiState()
}

class ApprovalViewModel(application: Application) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(ApprovalUiState())
    val uiState: StateFlow<ApprovalUiState> = _uiState

    private val _actionState = MutableStateFlow<ApprovalActionUiState>(ApprovalActionUiState.Idle)
    val actionState: StateFlow<ApprovalActionUiState> = _actionState

    fun loadApprovals() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val api = ApiClient.getClient(getApplication())
                val response = api.getApprovals()
                val approvalList = response.data ?: emptyList()
                _uiState.value = ApprovalUiState(
                    approvals = approvalList,
                    isLoading = false,
                    error = response.error
                )
            } catch (e: Exception) {
                _uiState.value = ApprovalUiState(
                    approvals = emptyList(),
                    isLoading = false,
                    error = e.message ?: "Gagal memuat data"
                )
            }
        }
    }

    /**
     * Approve or reject a transaction.
     * @param transactionId ID of the transaction
     * @param action "approve" or "reject"
     * @param comment optional comment
     */
    fun approveTransaction(transactionId: String, action: String, comment: String? = null) {
        viewModelScope.launch {
            _actionState.value = ApprovalActionUiState.Loading
            try {
                val api = ApiClient.getClient(getApplication())
                val request = ApproveRequest(
                    transactionId = transactionId,
                    action = action,
                    comment = comment
                )
                val response = api.approveTransaction(request)
                if (response.data != null) {
                    _actionState.value = ApprovalActionUiState.Success(response.data)
                    loadApprovals()
                } else {
                    _actionState.value = ApprovalActionUiState.Error(response.error ?: "Gagal memproses")
                }
            } catch (e: Exception) {
                _actionState.value = ApprovalActionUiState.Error(e.message ?: "Gagal memproses")
            }
        }
    }

    // Backward-compatible methods
    fun approve(id: String, comment: String? = null) = approveTransaction(id, "approve", comment)
    fun reject(id: String, comment: String? = null) = approveTransaction(id, "reject", comment)

    fun clearActionState() {
        _actionState.value = ApprovalActionUiState.Idle
    }

    data class ApprovalUiState(
        val approvals: List<Approval> = emptyList(),
        val isLoading: Boolean = false,
        val error: String? = null,
        val sessionExpired: Boolean = false
    )
}
