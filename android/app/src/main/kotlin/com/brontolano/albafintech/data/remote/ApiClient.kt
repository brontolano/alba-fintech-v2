package com.brontolano.albafintech.data.remote

import android.content.Context
import com.brontolano.albafintech.AlbaFintechApp
import com.brontolano.albafintech.data.local.SessionManager
import kotlinx.serialization.json.Json
import okhttp3.*
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.KotlinxConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {

    private const val BASE_URL = "https://alba.brontolano.com/"
    private const val TIMEOUT_SECONDS = 30L

    private var retrofit: Retrofit? = null

    fun getClient(context: Context): ApiService {
        val sessionManager = (context.applicationContext as AlbaFintechApp).getSessionManager()
        val token = sessionManager.getAccessToken()

        if (retrofit == null) {
            val json = Json {
                ignoreUnknownKeys = true
                coerceInputValues = true
            }

            val logging = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }

            val client = OkHttpClient.Builder()
                .connectTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
                .readTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
                .writeTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
                .addInterceptor(logging)
                .addInterceptor(TokenInterceptor(sessionManager))
                .build()

            retrofit = Retrofit.Builder()
                .baseUrl(BASE_URL)
                .client(client)
                .addConverterFactory(KotlinxConverterFactory.create(json))
                .build()
        }

        @Suppress("UNCHECKED_CAST")
        return (retrofit as Retrofit).create(ApiService::class.java)
    }

    private class TokenInterceptor(private val sessionManager: SessionManager) : Interceptor {
        override fun intercept(chain: Interceptor.Chain): Response {
            val original = chain.request()
            val requestBuilder = original.newBuilder()

            val token = sessionManager.getAccessToken()
            if (!token.isNullOrEmpty()) {
                requestBuilder.addHeader("Authorization", "Bearer $token")
                requestBuilder.addHeader("Cookie", "next-auth.session-token=$token")
            }

            return chain.proceed(requestBuilder.build())
        }
    }
}
