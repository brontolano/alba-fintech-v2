package com.brontolano.albafintech.ui.navigation

import android.content.Context
import com.brontolano.albafintech.data.local.AuthLocalDataSource
import com.brontolano.albafintech.data.remote.ApiClient
import com.brontolano.albafintech.data.remote.AlbaApiService
import com.brontolano.albafintech.data.repository.AuthRepository
import com.brontolano.albafintech.data.repository.AuthRepositoryImpl
import com.brontolano.albafintech.data.repository.TransactionRepository

/**
 * Simple service locator / dependency injection container.
 */
object AppContainer {

    @Volatile
    private var authLocalDataSource: AuthLocalDataSource? = null

    @Volatile
    private var apiService: AlbaApiService? = null

    @Volatile
    private var authRepository: AuthRepository? = null

    @Volatile
    private var transactionRepository: TransactionRepository? = null

    fun init(context: Context) {
        authLocalDataSource = AuthLocalDataSource(context.applicationContext)
        apiService = ApiClient.getApiService(authLocalDataSource!!)
        authRepository = AuthRepositoryImpl(apiService!!, authLocalDataSource!!)
        transactionRepository = TransactionRepository(apiService!!)
    }

    fun getAuthLocalDataSource(): AuthLocalDataSource = authLocalDataSource!!
    fun getApiService(): AlbaApiService = apiService!!
    fun getAuthRepository(): AuthRepository = authRepository!!
    fun getTransactionRepository(): TransactionRepository = transactionRepository!!
}
