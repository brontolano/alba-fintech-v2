package com.brontolano.albafintech.data.model

/**
 * A discriminated union that captures the result of an operation.
 * Success, Error, and Loading states are modeled as a sealed class.
 */
sealed class Result<out T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Error(val message: String, val code: Int? = null) : Result<Nothing>()
    object Loading : Result<Nothing>()

    val isSuccess get() = this is Success<T>
    val isError get() = this is Error
    val isLoading get() = this is Loading
}
