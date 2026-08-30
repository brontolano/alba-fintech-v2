package com.brontolano.albafintech.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.brontolano.albafintech.data.model.User
import com.brontolano.albafintech.data.repository.AuthRepository
import com.brontolano.albafintech.ui.navigation.AppContainer
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class AuthUiState(
    val username: String = "",
    val password: String = "",
    val isLoggingIn: Boolean = false,
    val error: String? = null,
    val user: User? = null
)

class AuthViewModel(
    private val authRepository: AuthRepository = AppContainer.getAuthRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    fun onUsernameChange(value: String) {
        _uiState.update { it.copy(username = value, error = null) }
    }

    fun onPasswordChange(value: String) {
        _uiState.update { it.copy(password = value, error = null) }
    }

    fun login() {
        val username = _uiState.value.username.trim()
        val password = _uiState.value.password

        if (username.isBlank() || password.isBlank()) {
            _uiState.update { it.copy(error = "Username and password are required") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoggingIn = true, error = null) }

            when (val result = authRepository.login(username, password)) {
                is com.brontolano.albafintech.data.model.Result.Success -> {
                    _uiState.update {
                        it.copy(isLoggingIn = false, user = result.data, error = null)
                    }
                }
                is com.brontolano.albafintech.data.model.Result.Error -> {
                    _uiState.update {
                        it.copy(isLoggingIn = false, error = result.message)
                    }
                }
                is com.brontolano.albafintech.data.model.Result.Loading -> {
                    _uiState.update { it.copy(isLoggingIn = true) }
                }
            }
        }
    }
}
