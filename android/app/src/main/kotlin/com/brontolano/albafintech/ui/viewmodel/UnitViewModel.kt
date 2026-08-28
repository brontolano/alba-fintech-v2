package com.brontolano.albafintech.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.brontolano.albafintech.data.models.Lembaga
import com.brontolano.albafintech.data.models.Unit as AppUnit
import com.brontolano.albafintech.data.remote.ApiClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class UnitViewModel(application: Application) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(UnitUiState())
    val uiState: StateFlow<UnitUiState> = _uiState

    // Alias for screens that reference unitListState
    val unitListState: StateFlow<UnitUiState> = _uiState

    private val _lembagaState = MutableStateFlow(LembagaUiState())
    val lembagaState: StateFlow<LembagaUiState> = _lembagaState

    init {
        loadUnits()
        loadLembagas()
    }

    fun loadUnits() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val api = ApiClient.getClient(getApplication())
                val response = api.getUnits()
                val unitList: List<AppUnit> = response.data ?: emptyList()
                _uiState.value = UnitUiState(units = unitList, isLoading = false, error = response.error)
            } catch (e: Exception) {
                _uiState.value = UnitUiState(units = emptyList(), isLoading = false, error = e.message ?: "Gagal memuat data")
            }
        }
    }

    fun loadLembagas() {
        viewModelScope.launch {
            _lembagaState.value = LembagaUiState(isLoading = true, error = null)
            try {
                val api = ApiClient.getClient(getApplication())
                val response = api.getLembagas()
                val lembagaList = response.data ?: emptyList()
                _lembagaState.value = LembagaUiState(lembagas = lembagaList, isLoading = false, error = response.error)
            } catch (e: Exception) {
                _lembagaState.value = LembagaUiState(lembagas = emptyList(), isLoading = false, error = e.message ?: "Gagal memuat data")
            }
        }
    }

    data class UnitUiState(
        val units: List<AppUnit> = emptyList(),
        val isLoading: Boolean = false,
        val error: String? = null
    )

    data class LembagaUiState(
        val lembagas: List<Lembaga> = emptyList(),
        val isLoading: Boolean = false,
        val error: String? = null
    )
}
