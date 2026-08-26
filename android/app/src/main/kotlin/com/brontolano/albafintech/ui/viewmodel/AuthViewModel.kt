package com.brontolano.albafintech.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.brontolano.albafintech.AlbaFintechApp
import com.brontolano.albafintech.data.local.SessionManager
import com.brontolano.albafintech.data.models.User
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class AuthViewModel(application: Application) : AndroidViewModel(application) {

    private val sessionManager = (application as AlbaFintechApp).getSessionManager()

    private val _uiState = MutableStateFlow(AuthUiState(isLoading = true))
    val uiState: StateFlow<AuthUiState> = _uiState

    init {
        checkLoginState()
    }

    private fun checkLoginState() {
        viewModelScope.launch {
            if (sessionManager.isLoggedIn()) {
                val role = sessionManager.getRole() ?: ""
                _uiState.value = AuthUiState(
                    isLoggedIn = true,
                    role = role,
                    isLoading = false
                )
            } else {
                _uiState.value = AuthUiState(isLoading = false)
            }
        }
    }

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _uiState.value = AuthUiState(isLoading = true)
            try {
                // Calls the NextAuth-compatible web endpoint
                val api = com.brontolano.albafintech.data.remote.ApiClient.getClient(getApplication())
                val response = api.login(
                    mapOf(
                        "email" to email,
                        "password" to password,
                        "redirect" to "false",
                        "callbackUrl" to "https://alba.brontolano.com/dashboard"
                    )
                )

                if (response.user != null && !response.accessToken.isNullOrEmpty()) {
                    sessionManager.saveSession(
                        accessToken = response.accessToken,
                        refreshToken = response.refreshToken,
                        userId = response.user.id,
                        role = response.user.role
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
                _uiState.value = AuthUiState(error = e.message ?: "Terjadi kesalahan")
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            try {
                val api = com.brontolano.albafintech.data.remote.ApiClient.getClient(getApplication())
                sessionManager.getAccessToken()?.let { api.logout(it) }
            } catch (_: Exception) { } finally {
                sessionManager.clearSession()
                _uiState.value = AuthUiState(isLoading = false)
            }
        }
    }
}

data class AuthUiState(
    val isLoading: Boolean = false,
    val isLoggedIn: Boolean = false,
    val role: String = "",
    val user: User? = null,
    val error: String? = null
)
