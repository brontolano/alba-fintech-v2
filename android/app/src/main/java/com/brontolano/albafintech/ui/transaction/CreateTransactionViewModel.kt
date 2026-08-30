package com.brontolano.albafintech.ui.transaction

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.brontolano.albafintech.data.model.Result
import com.brontolano.albafintech.data.model.TransactionRequest
import com.brontolano.albafintech.data.model.TransactionType
import com.brontolano.albafintech.data.model.Unit as UnitModel
import com.brontolano.albafintech.data.repository.TransactionRepository
import com.brontolano.albafintech.ui.navigation.AppContainer
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * UI state for the Create Transaction screen.
 * Holds form values, validation errors, unit list, and creation state.
 */
data class CreateTransactionUiState(
    // Unit selection
    val units: List<UnitModel> = emptyList(),
    val isLoadingUnits: Boolean = false,
    val selectedUnit: UnitModel? = null,
    val unitError: String? = null,

    // Form fields
    val amount: String = "",
    val amountError: String? = null,
    val description: String = "",
    val descriptionError: String? = null,
    val category: String = "",
    val type: TransactionType = TransactionType.EXPENSE,
    val method: String = "Tunai",

    // Photo
    val photoUri: Uri? = null,

    // Location
    val latitude: Double? = null,
    val longitude: Double? = null,

    // Creation state
    val isCreating: Boolean = false,
    val creationError: String? = null
)

/**
 * One-shot events emitted by the ViewModel for navigation and messaging.
 */
sealed class CreateTransactionEvent {
    data class ShowMessage(val message: String) : CreateTransactionEvent()
    object NavigateBack : CreateTransactionEvent()
}

/**
 * ViewModel for the Create Transaction screen.
 * Manages unit list loading (GET /api/units), form state, validation,
 * and transaction creation (POST /api/transactions).
 */
class CreateTransactionViewModel(
    private val repository: TransactionRepository = AppContainer.getTransactionRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(CreateTransactionUiState())
    val uiState: StateFlow<CreateTransactionUiState> = _uiState.asStateFlow()

    private val _eventFlow = MutableStateFlow<CreateTransactionEvent?>(null)
    val eventFlow: StateFlow<CreateTransactionEvent?> = _eventFlow.asStateFlow()

    // ---- Unit Loading ----

    /**
     * Loads units from GET /api/units.
     * Falls back to a default list if the API call fails.
     */
    fun loadUnits() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingUnits = true, unitError = null) }
            when (val result = repository.getUnits()) {
                is Result.Success -> {
                    val units = if (result.data.isEmpty()) {
                        // Fallback to default units if API returns empty list
                        defaultUnits()
                    } else {
                        result.data
                    }
                    _uiState.update {
                        it.copy(
                            units = units,
                            isLoadingUnits = false,
                            unitError = null
                        )
                    }
                }
                is Result.Error -> {
                    // Fall back to default units on error
                    _uiState.update {
                        it.copy(
                            units = defaultUnits(),
                            isLoadingUnits = false,
                            unitError = null
                        )
                    }
                    _eventFlow.value = CreateTransactionEvent.ShowMessage(
                        "Menggunakan unit default: ${result.message}"
                    )
                }
                is Result.Loading -> {}
            }
        }
    }

    private fun defaultUnits(): List<UnitModel> {
        return listOf(
            UnitModel(id = 1L, name = "Kantor Pusat", type = "", balance = 0.0),
            UnitModel(id = 2L, name = "Kantin", type = "", balance = 0.0),
            UnitModel(id = 3L, name = "Koperasi", type = "", balance = 0.0)
        )
    }

    // ---- Form State Mutators ----

    fun selectUnit(unit: UnitModel) {
        _uiState.update { it.copy(selectedUnit = unit, unitError = null) }
    }

    fun updateAmount(value: String) {
        _uiState.update { it.copy(amount = value, amountError = null) }
    }

    fun updateDescription(value: String) {
        _uiState.update { it.copy(description = value, descriptionError = null) }
    }

    fun updateCategory(value: String) {
        _uiState.update { it.copy(category = value) }
    }

    fun updateType(type: TransactionType) {
        _uiState.update { it.copy(type = type) }
    }

    fun updateMethod(method: String) {
        _uiState.update { it.copy(method = method) }
    }

    fun setPhotoUri(uri: Uri?) {
        _uiState.update { it.copy(photoUri = uri) }
    }

    fun clearPhoto() {
        _uiState.update { it.copy(photoUri = null) }
    }

    fun setLocation(latitude: Double, longitude: Double) {
        _uiState.update { it.copy(latitude = latitude, longitude = longitude) }
    }

    fun clearLocation() {
        _uiState.update { it.copy(latitude = null, longitude = null) }
    }

    fun clearCreationError() {
        _uiState.update { it.copy(creationError = null) }
    }

    fun clearEvent() {
        _eventFlow.value = null
    }

    // ---- Validation ----

    /**
     * Validates all form fields and sets inline error messages.
     * Returns true if all fields are valid.
     */
    private fun validateForm(): Boolean {
        val state = _uiState.value
        var isValid = true

        // Validate unit selection
        if (state.selectedUnit == null) {
            _uiState.update { it.copy(unitError = "Pilih unit terlebih dahulu") }
            isValid = false
        }

        // Validate amount (rejects <= 0)
        val amountDigits = state.amount.replace(Regex("[^\\d]"), "")
        val amountValue = amountDigits.toDoubleOrNull()
        if (amountValue == null || amountValue <= 0) {
            _uiState.update { it.copy(amountError = "Nominal harus lebih dari 0") }
            isValid = false
        }

        // Validate description (non-empty)
        if (state.description.isBlank()) {
            _uiState.update { it.copy(descriptionError = "Keterangan tidak boleh kosong") }
            isValid = false
        }

        return isValid
    }

    // ---- Transaction Creation ----

    /**
     * Validates the form and creates a transaction via POST /api/transactions.
     * On success, emits a NavigateBack event to return to the transaction list.
     */
    fun createTransaction() {
        // Clear any previous creation state
        _uiState.update { it.copy(creationError = null) }

        // Validate form fields
        if (!validateForm()) return

        val state = _uiState.value
        val amountDigits = state.amount.replace(Regex("[^\\d]"), "")
        val amountValue = amountDigits.toDoubleOrNull() ?: 0.0

        val request = TransactionRequest(
            unitId = state.selectedUnit!!.id,
            amount = amountValue,
            description = state.description,
            type = state.type,
            method = state.method,
            category = state.category,
            photoUrl = state.photoUri?.toString(),
            latitude = state.latitude,
            longitude = state.longitude
        )

        viewModelScope.launch {
            _uiState.update { it.copy(isCreating = true, creationError = null) }
            when (val result = repository.createTransaction(request)) {
                is Result.Success -> {
                    _uiState.update {
                        it.copy(
                            isCreating = false,
                            creationError = null,
                            photoUri = null,
                            latitude = null,
                            longitude = null
                        )
                    }
                    _eventFlow.value = CreateTransactionEvent.NavigateBack
                }
                is Result.Error -> {
                    _uiState.update {
                        it.copy(
                            isCreating = false,
                            creationError = result.message ?: "Gagal membuat transaksi"
                        )
                    }
                    _eventFlow.value = CreateTransactionEvent.ShowMessage(
                        "Gagal: ${result.message ?: "Unknown error"}"
                    )
                }
                is Result.Loading -> {}
            }
        }
    }
}
