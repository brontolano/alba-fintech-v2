package com.brontolano.albafintech.ui.screens

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Analytics
import androidx.compose.material.icons.filled.Domain
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.Task
import androidx.compose.ui.graphics.vector.ImageVector

/**
 * Route definitions for the app's navigation graph.
 * Each screen is keyed by a unique route string used by Jetpack Navigation.
 *
 * Role access follows the tenant hierarchy:
 *   SuperAdmin → Pimpinan → Unit → Manager → Staff
 */
sealed class Screen(
    val route: String,
    val title: String,
    val icon: ImageVector,
    val allowedRoles: List<String> = emptyList()
) {
    data object Home : Screen("home", "Beranda", Icons.Default.Home)

    // SuperAdmin-only screens
    data object Lembaga : Screen("lembaga", "Lembaga", Icons.Default.Domain, listOf("SUPERADMIN"))
    data object Units : Screen("units", "Unit", Icons.Default.Domain, listOf("SUPERADMIN"))

    // Shared screens
    data object Transactions : Screen("transactions", "Transaksi", Icons.Default.Receipt)
    data object TransactionDetail : Screen("transaction_detail/{id}", "Detail", Icons.Default.Receipt)

    // Approval workflow (Manager, Pimpinan, SuperAdmin)
    data object Approvals : Screen("approvals", "Persetujuan", Icons.Default.Task, listOf("SUPERADMIN", "MANAGER", "PIMPINAN"))

    // Reports (Pimpinan only)
    data object Reports : Screen("reports", "Laporan", Icons.Default.Analytics, listOf("PIMPINAN"))

    // Account / Profile
    data object Account : Screen("account", "Akun", Icons.Default.Person)

    // Notifications
    data object Notifications : Screen("notifications", "Notifikasi", Icons.Default.Notifications)

    // Add Transaction
    data object AddTransaction : Screen("add_transaction", "Tambah Transaksi", Icons.Default.Add)

    companion object {
        fun fromRoute(route: String?): Screen? {
            if (route == null) return null
            return when {
                route.startsWith(Home.route) -> Home
                route.startsWith(Lembaga.route) -> Lembaga
                route.startsWith(Units.route) -> Units
                route.startsWith(Transactions.route) -> Transactions
                route.startsWith(TransactionDetail.route.replace("{id}", "")) -> TransactionDetail
                route.startsWith(Approvals.route) -> Approvals
                route.startsWith(Reports.route) -> Reports
                route.startsWith(Account.route) -> Account
                route.startsWith(Notifications.route) -> Notifications
                route.startsWith(AddTransaction.route) -> AddTransaction
                else -> null
            }
        }
    }
}

/**
 * Returns the list of bottom-navigation screens visible for a given user role.
 * Excludes SuperAdmin-only management screens.
 */
fun bottomNavItemsForRole(role: String?): List<Screen> {
    return when (role) {
        "SUPERADMIN" -> listOf(
            Screen.Home,
            Screen.Units,
            Screen.Transactions,
            Screen.Approvals,
            Screen.Account
        )
        "PIMPINAN" -> listOf(
            Screen.Home,
            Screen.Transactions,
            Screen.Reports,
            Screen.Approvals,
            Screen.Account
        )
        "MANAGER" -> listOf(
            Screen.Home,
            Screen.Transactions,
            Screen.Approvals,
            Screen.Account
        )
        "STAFF" -> listOf(
            Screen.Home,
            Screen.Transactions,
            Screen.Account
        )
        else -> listOf(Screen.Home, Screen.Account)
    }
}
