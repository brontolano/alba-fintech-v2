package com.brontolano.albafintech.data.repository

import com.brontolano.albafintech.data.model.AuthResponse
import com.brontolano.albafintech.data.model.User
import com.brontolano.albafintech.data.model.UserRole
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first

/**
 * Repository for authentication operations. Delegates to the remote API
 * via [AlbaApiService] and the local data store via [AuthLocalDataSource].
 */
interface AuthRepository {

    val currentUser: Flow<User?>
    val currentRole: Flow<UserRole>
    val authToken: Flow<String?>

    suspend fun login(username: String, password: String): com.brontolano.albafintech.data.model.Result<User>

    suspend fun logout()

    suspend fun isLoggedIn(): Boolean

    suspend fun getRole(): UserRole
}
