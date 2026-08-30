@file:Suppress("unused")

package com.brontolano.albafintech.data.repository

import com.brontolano.albafintech.data.local.AuthLocalDataSource
import com.brontolano.albafintech.data.model.Result
import com.brontolano.albafintech.data.model.User
import com.brontolano.albafintech.data.model.UserRole
import com.brontolano.albafintech.data.remote.AlbaApiService
import kotlinx.coroutines.flow.Flow

class AuthRepositoryImpl(
    private val apiService: AlbaApiService,
    private val authLocalDataSource: AuthLocalDataSource
) : AuthRepository {

    override val currentUser: Flow<User?> = authLocalDataSource.userFlow

    override val currentRole: Flow<UserRole> = authLocalDataSource.roleFlow

    override val authToken: Flow<String?> = authLocalDataSource.tokenFlow

    override suspend fun login(username: String, password: String): Result<User> {
        return try {
            val response = apiService.login(username = username, password = password)
            if (response.isSuccessful) {
                val body = response.body()
                if (body != null && body.success && body.token != null && body.user != null) {
                    authLocalDataSource.saveAuthData(
                        token = body.token,
                        user = body.user
                    )
                    Result.Success(body.user)
                } else {
                    Result.Error(body?.message ?: "Login failed", response.code())
                }
            } else {
                Result.Error(
                    message = "Login failed: ${response.message()}",
                    code = response.code()
                )
            }
        } catch (e: Exception) {
            Result.Error("Network error: ${e.localizedMessage}")
        }
    }

    override suspend fun logout() {
        authLocalDataSource.clearAuthData()
    }

    override suspend fun isLoggedIn(): Boolean {
        return authLocalDataSource.getTokenNow() != null
    }

    override suspend fun getRole(): UserRole {
        return authLocalDataSource.getRoleNow()
    }
}
