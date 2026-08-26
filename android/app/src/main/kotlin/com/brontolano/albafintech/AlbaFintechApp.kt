package com.brontolano.albafintech

import android.app.Application
import android.content.Context
import com.brontolano.albafintech.data.local.SessionManager

class AlbaFintechApp : Application() {

    private lateinit var sessionManager: SessionManager

    override fun onCreate() {
        super.onCreate()
        sessionManager = SessionManager(this)
    }

    fun getSessionManager(): SessionManager = sessionManager

    companion object {
        @Volatile
        private var INSTANCE: AlbaFintechApp? = null

        fun getInstance(context: Context): AlbaFintechApp {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: (context.applicationContext as AlbaFintechApp).also { INSTANCE = it }
            }
        }
    }
}
