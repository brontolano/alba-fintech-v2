package com.brontolano.albafintech.ui.transaction

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.brontolano.albafintech.data.model.CompanyUnit
import com.brontolano.albafintech.data.model.Result
import com.brontolano.albafintech.data.model.TransactionType
import com.brontolano.albafintech.data.repository.AppContainer
import com.brontolano.albafintech.data.repository.TransactionRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Form state for transaction creation.
 */
data class CreateTransactionFormState(
    val description: String = "",
    val amount: String = "",
    val transactionType: TransactionType = TransactionType.EXPENSE,
    val unitId: Long = 0L,
    val units: List<CompanyUnit> = emptyList(),
    val isLoadingUnits: Boolean = false,
    val validationError: String? = null,
    val isSubmitting: Boolean = false,
    val successMessage: String? = null
)

/**
 * CreateTransactionViewModel handles transaction creation with unit loading and form validation.
 */
class CreateTransactionViewModel(
    private val repository: TransactionRepository = AppContainer.getTransactionRepository()
) : ViewModel() {

    private val _formState = MutableStateFlow(CreateTransactionFormState())
    val formState: StateFlow<CreateTransactionFormState> = _formState

    init {
        loadUnits()
    }

    /**
     * Load available units for the unit dropdown.
     */
    fun loadUnits() {
        viewModelScope.launch {
            _formState.update { it.copy(isLoadingUnits = true) }
            val result = repository.getUnits()
            when (result) {
                is Result.Success -> {
                    _formState.update { 
                        it.copy(units = result.data, isLoadingUnits = false) 
                    }
                }
                is Result.Error -> {
                    _formState.update { 
                        it.copy(isLoadingUnits = false) 
                    }
                }
                is Result.Loading -> {}
            }
        }
    }

    /**
     * Update description field.
     */
    fun updateDescription(description: String) {
        _formState.update { it.copy(description = description, validationError = null) }
    }

    /**
     * Update amount field.
     */
    fun updateAmount(amount: String) {
        _formState.update { it.copy(amount = amount, validationError = null) }
    }

    /**
     * Update transaction type.
     */
    fun updateTransactionType(type: TransactionType) {
        _formState.update { it.copy(transactionType = type) }
    }

    /**
     * Update selected unit.
     */
    fun updateUnitId(unitId: Long) {
        _formState.update { it.copy(unitId = unitId) }
    }

    /**
     * Validate the form.
     * @return true if form is valid, false otherwise
     */
    fun validate(): Boolean {
        val state = _formState.value
        
        if (state.description.isBlank()) {
            _formState.update { it.copy(validationError = "Description is required") }
            return false
        }
        
        if (state.amount.isBlank()) {
            _formState.update { it.copy(validationError = "Amount is required") }
            return false
        }
        
        if (state.amount.toDoubleOrNull() == null) {
            _formState.update { it.copy(validationError = "Invalid amount format") }
            return false
        }
        
        if (state.unitId == 0L) {
            _formState.update { it.copy(validationError = "Unit is required") }
            return false
        }
        
        _formState.update { it.copy(validationError = null) }
        return true
    }

    /**
     * Create a new transaction.
     */
    fun createTransaction() {
        if (!validate()) return
        
        val state = _formState.value
        val amount = state.amount.toDoubleOrNull() ?: return
        
        viewModelScope.launch {
            _formState.update { it.copy(isSubmitting = true) }
            
            val request = com.brontolano.albafintech.data.model.CreateTransactionRequest(
                description = state.description,
                amount = amount,
                type = state.transactionType,
                unitId = state.unitId
            )
            
            val result = repository.createTransaction(request)
            
            when (result) {
                is Result.Success -> {
                    _formState.update { 
                        it.copy(
                            isSubmitting = false,
                            successMessage = "Transaction created successfully"
                        )
                    }
                }
                is Result.Error -> {
                    _formState.update { 
                        it.copy(isSubmitting = false)
                    }
                }
                is Result.Loading -> {}
            }
        }
    }

    /**
     * Clear the form.
     */
    fun clearForm() {
        _formState.update { CreateTransactionFormState() }
        loadUnits()
    }

    /**
     * Clear success message.
     */
    fun clearSuccessMessage() {
        _formState.update { it.copy(successMessage = null) }
    }
}