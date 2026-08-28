package com.brontolano.albafintech.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.brontolano.albafintech.AlbaFintechApp
import com.brontolano.albafintech.data.local.SessionManager
import com.brontolano.albafintech.data.models.User
import com.brontolano.albafintech.data.remote.ApiClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class AuthViewModel(application: Application) : AndroidViewModel(application) {

    private val sessionManager = (application as AlbaFintechApp).getSessionManager()

    private val _uiState = MutableStateFlow(AuthUiState(isLoading = true))
    val uiState: StateFlow<AuthUiState> = _uiState

    init {
        // Register 401 callback so expired sessions are detected across all API calls
        ApiClient.setSessionExpiredCallback {
            logoutFromExpiredSession()
        }
        checkLoginState()
    }

    /** Public so the UI layer (e.g. session-expiry callback) can trigger a re-check */
    fun checkLoginState() {
        viewModelScope.launch {
            if (sessionManager.isLoggedIn()) {
                val user = sessionManager.getUser()
                val role = sessionManager.getRole() ?: ""
                if (user != null && role.isNotEmpty()) {
                    _uiState.value = AuthUiState(
                        isLoggedIn = true,
                        role = role,
                        user = user,
                        isLoading = false
                    )
                } else {
                    // Session data corrupted, clear it
                    sessionManager.clearSession()
                    _uiState.value = AuthUiState(isLoading = false)
                }
            } else {
                _uiState.value = AuthUiState(isLoading = false)
            }
        }
    }

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _uiState.value = AuthUiState(isLoading = true, error = null)
            try {
                val api = ApiClient.getClient(getApplication())
                val response = api.login(
                    com.brontolano.albafintech.data.models.LoginRequest(
                        email = email.trim(),
                        password = password
                    )
                )

                if (response.user != null && !response.accessToken.isNullOrEmpty()) {
                    sessionManager.saveSessionWithUser(
                        accessToken = response.accessToken,
                        user = response.user
                    )
                    _uiState.value = AuthUiState(
                        isLoggedIn = true,
                        role = response.user.role,
                        user = response.user
                    )
                } else {
                    _uiState.value = AuthUiState(error = response.error ?: "Login gagal")
                }
            } catch (e: Exception) {
                _uiState.value = AuthUiState(error = e.message ?: "Tidak dapat terhubung ke server")
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            try {
                val api = ApiClient.getClient(getApplication())
                api.logout()
            } catch (_: Exception) {
                // Ignore network errors during logout
            } finally {
                sessionManager.clearSession()
                _uiState.value = AuthUiState(isLoading = false)
            }
        }
    }

    private fun logoutFromExpiredSession() {
        viewModelScope.launch {
            sessionManager.clearSession()
            _uiState.value = AuthUiState(isLoading = false)
        }
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }

    data class AuthUiState(
        val isLoading: Boolean = false,
        val isLoggedIn: Boolean = false,
        val role: String = "",
        val user: User? = null,
        val error: String? = null
    )
}
