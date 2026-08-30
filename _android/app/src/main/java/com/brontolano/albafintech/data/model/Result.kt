package com.brontolano.albafintech.data.model

/**
 * Result wrapper for API responses.
 * Sealed class representing success, error, or loading states.
 */
sealed interface Result<out T> {
    data class Success<T>(val data: T) : Result<T>
    data class Error(val message: String, val cause: Throwable? = null) : Result<Nothing>
    object Loading : Result<Nothing>
}