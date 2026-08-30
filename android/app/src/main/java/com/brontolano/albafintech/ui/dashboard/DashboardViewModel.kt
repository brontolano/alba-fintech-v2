package com.brontolano.albafintech.ui.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.brontolano.albafintech.data.model.DashboardStats
import com.brontolano.albafintech.data.model.Result
import com.brontolano.albafintech.data.model.UserRole
import com.brontolano.albafintech.data.repository.TransactionRepository
import com.brontolano.albafintech.ui.navigation.AppContainer
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class DashboardUiState(
    val stats: DashboardStats? = null,
    val isLoading: Boolean = false,
    val error: String? = null,
    val role: UserRole = UserRole.STAFF
)

class DashboardViewModel(
    private val repository: TransactionRepository = AppContainer.getTransactionRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    fun loadDashboardStats(role: UserRole, unitId: Long? = null) {
        _uiState.update { it.copy(isLoading = true, error = null, role = role) }
        viewModelScope.launch {
            when (val result = repository.getDashboardStats(role, unitId)) {
                is Result.Success -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            stats = result.data,
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
                is Result.Loading -> {
                    _uiState.update { it.copy(isLoading = true) }
                }
            }
        }
    }

    fun refresh(role: UserRole, unitId: Long? = null) {
        loadDashboardStats(role, unitId)
    }
}
