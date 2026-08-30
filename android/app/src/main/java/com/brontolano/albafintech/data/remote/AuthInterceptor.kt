package com.brontolano.albafintech.data.remote

import com.brontolano.albafintech.data.local.AuthLocalDataSource
import okhttp3.Interceptor
import okhttp3.Response

/**
 * Adds the auth token (if available) as a Bearer header to every request.
 */
class AuthInterceptor(
    private val authLocalDataSource: AuthLocalDataSource
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val original = chain.request()
        val token = authLocalDataSource.getTokenNow()

        val requestBuilder = original.newBuilder()
        if (!token.isNullOrBlank()) {
            requestBuilder.addHeader("Authorization", "Bearer $token")
        }
        requestBuilder.addHeader("Accept", "application/json")
        return chain.proceed(requestBuilder.build())
    }
}
