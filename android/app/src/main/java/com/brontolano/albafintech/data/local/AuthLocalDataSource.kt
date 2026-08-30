package com.brontolano.albafintech.data.local

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.brontolano.albafintech.data.model.User
import com.brontolano.albafintech.data.model.UserRole
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private const val DATASTORE_NAME = "alba_prefs"

private val Context.authDataStore by preferencesDataStore(name = DATASTORE_NAME)

/**
 * Local data source backed by Jetpack DataStore for persisting
 * auth token, user role and user info.
 */
class AuthLocalDataSource(private val context: Context) {

    private val moshi: Moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()

    private val userAdapter = moshi.adapter(User::class.java)

    companion object {
        private val TOKEN = stringPreferencesKey("auth_token")
        private val USER_JSON = stringPreferencesKey("user_json")
        private val ROLE = stringPreferencesKey("user_role")
        private val UNIT_ID = stringPreferencesKey("unit_id")
        private val UNIT_NAME = stringPreferencesKey("unit_name")
    }

    // ---- Flows ----

    val tokenFlow: Flow<String?> = context.authDataStore.data
        .map { prefs -> prefs[TOKEN] }

    val userFlow: Flow<User?> = context.authDataStore.data
        .map { prefs ->
            prefs[USER_JSON]?.let { json -> userAdapter.fromJson(json) }
        }

    val roleFlow: Flow<UserRole> = context.authDataStore.data
        .map { prefs ->
            prefs[ROLE]?.let { raw ->
                runCatching { UserRole.valueOf(raw) }.getOrDefault(UserRole.STAFF)
            } ?: UserRole.STAFF
        }

    val unitIdFlow: Flow<Long?> = context.authDataStore.data
        .map { prefs -> prefs[UNIT_ID]?.toLongOrNull() }

    val unitNameFlow: Flow<String?> = context.authDataStore.data
        .map { prefs -> prefs[UNIT_NAME] }

    // ---- Synchronous accessors ----

    @Volatile
    private var cachedToken: String? = null

    @Volatile
    private var cachedUser: User? = null

    @Volatile
    private var cachedRole: UserRole = UserRole.STAFF

    @Volatile
    private var cachedUnitId: Long? = null

    @Volatile
    private var cachedUnitName: String? = null

    fun getTokenNow(): String? = cachedToken

    fun getUserNow(): User? = cachedUser

    fun getRoleNow(): UserRole = cachedRole

    fun getUnitIdNow(): Long? = cachedUnitId

    fun getUnitNameNow(): String? = cachedUnitName

    // ---- Save ----

    suspend fun saveAuthData(token: String, user: User) {
        context.authDataStore.edit { prefs ->
            prefs[TOKEN] = token
            prefs[USER_JSON] = userAdapter.toJson(user)
            prefs[ROLE] = user.role.name
            prefs[UNIT_ID] = user.unitId?.toString() ?: ""
            prefs[UNIT_NAME] = user.unitName ?: ""
        }
        // Update in-memory cache
        cachedToken = token
        cachedUser = user
        cachedRole = user.role
        cachedUnitId = user.unitId
        cachedUnitName = user.unitName
    }

    suspend fun clearAuthData() {
        context.authDataStore.edit { prefs ->
            prefs.clear()
        }
        cachedToken = null
        cachedUser = null
        cachedRole = UserRole.STAFF
        cachedUnitId = null
        cachedUnitName = null
    }
}
