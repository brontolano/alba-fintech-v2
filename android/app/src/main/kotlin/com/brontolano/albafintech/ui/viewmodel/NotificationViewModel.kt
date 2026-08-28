package com.brontolano.albafintech.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.brontolano.albafintech.data.models.ApiResponse
import com.brontolano.albafintech.data.models.Lembaga
import com.brontolano.albafintech.data.remote.ApiClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class NotificationViewModel(application: Application) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(NotificationUiState())
    val uiState: StateFlow<NotificationUiState> = _uiState

    fun loadNotifications(limit: Int = 20, isRead: Boolean? = null) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val api = ApiClient.getClient(getApplication())
                val response = api.getNotifications(limit = limit, isRead = isRead)
                val notifList = response.data ?: emptyList()
                val unreadCount = notifList.count { !it.isRead }
                _uiState.value = NotificationUiState(
                    notifications = notifList,
                    unreadCount = unreadCount,
                    isLoading = false,
                    error = response.error
                )
            } catch (e: Exception) {
                _uiState.value = NotificationUiState(
                    notifications = emptyList(),
                    isLoading = false,
                    error = e.message ?: "Gagal memuat notifikasi"
                )
            }
        }
    }

    fun markAllRead() {
        viewModelScope.launch {
            try {
                val api = ApiClient.getClient(getApplication())
                api.markAllRead(action = "markAllRead")
                // Update UI state to mark all as read
                val currentList = _uiState.value.notifications
                _uiState.value = _uiState.value.copy(
                    notifications = currentList.map { it.copy(isRead = true) },
                    unreadCount = 0
                )
            } catch (_: Exception) {
                // Handle error silently; the list won't update
            }
        }
    }

    data class NotificationUiState(
        val notifications: List<com.brontolano.albafintech.data.models.Notification> = emptyList(),
        val unreadCount: Int = 0,
        val isLoading: Boolean = false,
        val error: String? = null
    )
}
