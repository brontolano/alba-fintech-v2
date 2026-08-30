package com.brontolano.albafintech.data.remote

import com.brontolano.albafintech.data.local.AuthLocalDataSource
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory

/**
 * Provides a configured [AlbaApiService] singleton.
 */
object ApiClient {
    private const val BASE_URL = "https://alba.brontolano.com/"

    @Volatile
    private var apiService: AlbaApiService? = null

    fun getApiService(authLocalDataSource: AuthLocalDataSource): AlbaApiService {
        return apiService ?: synchronized(this) {
            apiService ?: buildApiService(authLocalDataSource).also { apiService = it }
        }
    }

    fun getApiService(): AlbaApiService {
        return apiService ?: synchronized(this) {
            apiService ?: buildApiService(null).also { apiService = it }
        }
    }

    private fun buildApiService(authLocalDataSource: AuthLocalDataSource?): AlbaApiService {
        val moshi = Moshi.Builder()
            .add(KotlinJsonAdapterFactory())
            .build()

        val client = OkHttpClient.Builder()
            .addInterceptor(HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            })
            .apply {
                if (authLocalDataSource != null) {
                    addInterceptor(AuthInterceptor(authLocalDataSource))
                }
            }
            .build()

        return Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(client)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
            .create(AlbaApiService::class.java)
    }
}
