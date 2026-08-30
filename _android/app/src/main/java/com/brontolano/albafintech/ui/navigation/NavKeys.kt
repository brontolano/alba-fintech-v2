package com.brontolano.albafintech.ui.navigation

import androidx.navigation3.runtime.NavKey
import kotlinx.serialization.Serializable

/**
 * Navigation keys for the app, implementing Navigation 3's NavKey interface.
 * All keys are @Serializable so they can be saved by rememberNavBackStack.
 */

@Serializable
data object LoginScreen : NavKey

@Serializable
data object DashboardScreen : NavKey

@Serializable
data object TransactionListScreen : NavKey

@Serializable
data class TransactionDetailScreen(val id: Long) : NavKey

@Serializable
data object CreateTransactionScreen : NavKey

@Serializable
data class EditTransactionScreen(val id: Long) : NavKey

@Serializable
data object ApprovalsScreen : NavKey

@Serializable
data object ProfileScreen : NavKey