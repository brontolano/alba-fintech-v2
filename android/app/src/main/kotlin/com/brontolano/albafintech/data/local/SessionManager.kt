package com.brontolano.albafintech.data.local

import android.content.Context
import android.content.SharedPreferences
import com.brontolano.albafintech.data.models.User

class SessionManager(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)

    fun saveSession(accessToken: String, refreshToken: String? = null, userId: String = "", role: String = "") {
        prefs.edit()
            .putString(KEY_ACCESS_TOKEN, accessToken)
            .putString(KEY_REFRESH_TOKEN, refreshToken)
            .putString(KEY_USER_ID, userId)
            .putString(KEY_ROLE, role)
            .apply()
    }

    fun saveSessionWithUser(accessToken: String, user: User) {
        prefs.edit()
            .putString(KEY_ACCESS_TOKEN, accessToken)
            .putString(KEY_USER_ID, user.id)
            .putString(KEY_USER_NAME, user.name)
            .putString(KEY_USER_EMAIL, user.email)
            .putString(KEY_ROLE, user.role)
            .putString(KEY_USER_UNIT_ID, user.unitId)
            .apply()
    }

    fun getAccessToken(): String? = prefs.getString(KEY_ACCESS_TOKEN, null)

    fun getRefreshToken(): String? = prefs.getString(KEY_REFRESH_TOKEN, null)

    fun getUserId(): String? = prefs.getString(KEY_USER_ID, null)

    fun getUserName(): String? = prefs.getString(KEY_USER_NAME, null)

    fun getUserEmail(): String? = prefs.getString(KEY_USER_EMAIL, null)

    fun getRole(): String? = prefs.getString(KEY_ROLE, null)

    fun getUserUnitId(): String? = prefs.getString(KEY_USER_UNIT_ID, null)

    fun getUser(): User? {
        val id = getUserId() ?: return null
        return User(
            id = id,
            name = getUserName(),
            email = getUserEmail() ?: "",
            role = getRole() ?: "",
            unitId = getUserUnitId()
        )
    }

    fun clearSession() {
        prefs.edit().clear().apply()
    }

    fun isLoggedIn(): Boolean = getAccessToken() != null

    companion object {
        private const val PREF_NAME = "alba_fintech_session"
        private const val KEY_ACCESS_TOKEN = "access_token"
        private const val KEY_REFRESH_TOKEN = "refresh_token"
        private const val KEY_USER_ID = "user_id"
        private const val KEY_USER_NAME = "user_name"
        private const val KEY_USER_EMAIL = "user_email"
        private const val KEY_ROLE = "role"
        private const val KEY_USER_UNIT_ID = "user_unit_id"
    }
}
