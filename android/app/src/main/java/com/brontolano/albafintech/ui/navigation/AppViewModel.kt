package com.brontolano.albafintech.ui.navigation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.brontolano.albafintech.data.model.UserRole
import com.brontolano.albafintech.data.repository.AuthRepository
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/**
 * ViewModel that owns the app-level back stack and auth state.
 * Provides initial destination based on auth status.
 */
class AppViewModel : ViewModel() {

    private val authRepository: AuthRepository = AppContainer.getAuthRepository()

    /**
     * Emits the current logged-in user (or null).
     */
    val currentUser = authRepository.currentUser
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)

    /**
     * Emits the current user role.
     */
    val currentRole = authRepository.currentRole
        .stateIn(viewModelScope, SharingStarted.Eagerly, UserRole.STAFF)

    /**
     * True when the user has a valid auth token.
     */
    val isLoggedIn = authRepository.authToken
        .map { it != null && it.isNotBlank() }
        .stateIn(viewModelScope, SharingStarted.Eagerly, false)

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
        }
    }
}
