package com.brontolano.albafintech.data.remote

import android.content.Context
import com.brontolano.albafintech.AlbaFintechApp
import com.brontolano.albafintech.data.local.SessionManager
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Response
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {

    private const val BASE_URL = "https://alba.brontolano.com/"
    private const val TIMEOUT_SECONDS = 30L

    private var retrofit: Retrofit? = null
    private var sessionExpiredCallback: (() -> Unit)? = null

    /**
     * Register a callback that fires when the server returns 401.
     * The UI layer (e.g. AuthViewModel / MainScreen) should use this
     * to clear session state and redirect to the login screen.
     */
    fun setSessionExpiredCallback(callback: () -> Unit) {
        sessionExpiredCallback = callback
    }

    fun getClient(context: Context): ApiService {
        val sessionManager = (context.applicationContext as AlbaFintechApp).getSessionManager()

        if (retrofit == null) {
            val gson = GsonBuilder()
                .setLenient()
                .create()

            val logging = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }

            val client = OkHttpClient.Builder()
                .connectTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
                .readTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
                .writeTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
                .addInterceptor(logging)
                .addInterceptor(TokenInterceptor(sessionManager))
                .addInterceptor(AuthInterceptor(sessionManager))
                .build()

            retrofit = Retrofit.Builder()
                .baseUrl(BASE_URL)
                .client(client)
                .addConverterFactory(GsonConverterFactory.create(gson))
                .build()
        }

        return retrofit!!.create(ApiService::class.java)
    }

    /**
     * Injects the NextAuth session token as a Cookie header so that
     * the existing Next.js getServerSession() flow works transparently.
     */
    private class TokenInterceptor(private val sessionManager: SessionManager) : Interceptor {
        override fun intercept(chain: Interceptor.Chain): Response {
            val original = chain.request()
            val token = sessionManager.getAccessToken()

            if (!token.isNullOrEmpty()) {
                val request = original.newBuilder()
                    .header("Cookie", "next-auth.session-token=$token")
                    .build()
                return chain.proceed(request)
            }
            return chain.proceed(original)
        }
    }

    /**
     * Detects 401 responses and triggers session cleanup + callback.
     */
    private class AuthInterceptor(private val sessionManager: SessionManager) : Interceptor {
        override fun intercept(chain: Interceptor.Chain): Response {
            val response = chain.proceed(chain.request())
            if (response.code == 401) {
                sessionManager.clearSession()
                sessionExpiredCallback?.invoke()
            }
            return response
        }
    }
}