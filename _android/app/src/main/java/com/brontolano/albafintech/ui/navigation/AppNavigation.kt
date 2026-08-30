package com.brontolano.albafintech.ui.navigation

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation3.runtime.NavKey
import androidx.navigation3.runtime.NavBackStack
import androidx.navigation3.runtime.rememberNavBackStack
import androidx.navigation3.runtime.rememberSaveableStateHolderNavEntryDecorator
import androidx.navigation3.runtime.NavEntry
import androidx.navigation3.ui.NavDisplay
import androidx.lifecycle.viewmodel.navigation3.rememberViewModelStoreNavEntryDecorator
import com.brontolano.albafintech.ui.auth.AuthViewModel
import com.brontolano.albafintech.ui.auth.LoginScreen
import com.brontolano.albafintech.ui.dashboard.DashboardScreen
import com.brontolano.albafintech.ui.dashboard.DashboardViewModel
import com.brontolano.albafintech.ui.approvals.ApprovalsScreen
import com.brontolano.albafintech.ui.approvals.ApprovalsViewModel
import com.brontolano.albafintech.ui.profile.ProfileScreen
import com.brontolano.albafintech.ui.profile.ProfileViewModel
import com.brontolano.albafintech.ui.transaction.CreateTransactionScreen
import com.brontolano.albafintech.ui.transaction.EditTransactionScreen
import com.brontolano.albafintech.ui.transaction.TransactionDetailScreen
import com.brontolano.albafintech.ui.transaction.TransactionListScreen
import com.brontolano.albafintech.ui.transaction.TransactionViewModel

/**
 * CompositionLocal for the navigation back stack.
 * Allows any composable to navigate by accessing the back stack.
 */
val LocalNavBackStack = compositionLocalOf<androidx.navigation3.runtime.NavBackStack<NavKey>> {
    error("NavBackStack not provided")
}

/**
 * Local provider for the SnackbarHostState so any composable can show snackbars.
 */
val LocalSnackbarHostState = compositionLocalOf<androidx.compose.material3.SnackbarHostState> {
    error("SnackbarHostState not provided")
}

/**
 * Simple navigation content resolver that renders the current screen based on the back stack.
 * This avoids Navigation 3's entryProvider @Composable context issues.
 */
@Composable
fun NavContent(
    backStack: androidx.navigation3.runtime.NavBackStack<NavKey>,
    onBack: () -> Unit,
    appViewModel: AppViewModel
) {
    // Pre-create all ViewModels to ensure @Composable context
    val authViewModel = androidx.lifecycle.viewmodel.compose.viewModel<AuthViewModel>()
    val dashboardViewModel = androidx.lifecycle.viewmodel.compose.viewModel<DashboardViewModel>()
    val approvalsViewModel = androidx.lifecycle.viewmodel.compose.viewModel<ApprovalsViewModel>()
    val profileViewModel = androidx.lifecycle.viewmodel.compose.viewModel<ProfileViewModel>()
    val transactionViewModel = androidx.lifecycle.viewmodel.compose.viewModel<TransactionViewModel>()
    
    val currentKey = backStack.lastOrNull()
    
    when (currentKey) {
        is LoginScreen -> {
            LoginScreen(
                viewModel = androidx.lifecycle.viewmodel.compose.viewModel<AuthViewModel>(),
                onLoginSuccess = {
                    backStack.removeAll { it !is LoginScreen }
                    backStack.add(DashboardScreen)
                }
            )
        }
        is DashboardScreen -> {
            DashboardScreen(
                viewModel = androidx.lifecycle.viewmodel.compose.viewModel<DashboardViewModel>(),
                appViewModel = androidx.lifecycle.viewmodel.compose.viewModel<AppViewModel>(),
                onNavigateToTransactions = { backStack.add(TransactionListScreen) },
                onNavigateToTransactionDetail = { id: Long -> backStack.add(TransactionDetailScreen(id)) },
                onNavigateToCreateTransaction = { backStack.add(CreateTransactionScreen) },
                onNavigateToEditTransaction = { id: Long -> backStack.add(EditTransactionScreen(id)) },
                onLogout = {
                    appViewModel.logout()
                    backStack.removeAll { it !is LoginScreen }
                    backStack.add(LoginScreen)
                }
            )
        }
        is TransactionListScreen -> {
            TransactionListScreen(
                viewModel = androidx.lifecycle.viewmodel.compose.viewModel<TransactionViewModel>(),
                onNavigateBack = onBack,
                onNavigateToDetail = { id: Long -> backStack.add(TransactionDetailScreen(id)) },
                onNavigateToCreate = { backStack.add(CreateTransactionScreen) }
            )
        }
        is TransactionDetailScreen -> {
            TransactionDetailScreen(
                transactionId = currentKey.id,
                viewModel = androidx.lifecycle.viewmodel.compose.viewModel<TransactionViewModel>(),
                onNavigateBack = onBack,
                onEditTransaction = { id: Long -> backStack.add(EditTransactionScreen(id)) }
            )
        }
        is CreateTransactionScreen -> {
            CreateTransactionScreen(
                viewModel = androidx.lifecycle.viewmodel.compose.viewModel<TransactionViewModel>(),
                onNavigateBack = onBack,
                onTransactionCreated = {
                    val bs = backStack
                    while (bs.size > 1 &&
                        bs.last() !is TransactionListScreen &&
                        bs.last() !is DashboardScreen) {
                        bs.removeLastOrNull()
                    }
                }
            )
        }
        is EditTransactionScreen -> {
            EditTransactionScreen(
                id = currentKey.id,
                viewModel = androidx.lifecycle.viewmodel.compose.viewModel<TransactionViewModel>(),
                onNavigateBack = onBack,
                onTransactionUpdated = onBack
            )
        }
        is ApprovalsScreen -> {
            ApprovalsScreen(
                viewModel = androidx.lifecycle.viewmodel.compose.viewModel<ApprovalsViewModel>(),
                onNavigateBack = { backStack.add(DashboardScreen) },
                onNavigateToDetail = { id: Long -> backStack.add(TransactionDetailScreen(id)) }
            )
        }
        is ProfileScreen -> {
            ProfileScreen(
                appViewModel = androidx.lifecycle.viewmodel.compose.viewModel<AppViewModel>(),
                onNavigateBack = onBack,
                onLogout = {
                    appViewModel.logout()
                    backStack.removeAll { it !is LoginScreen }
                    backStack.add(LoginScreen)
                }
            )
        }
        else -> {
            androidx.compose.material3.Text("Unknown screen")
        }
    }
}

/**
 * Root navigation composable using Navigation 3 back stack with custom content rendering.
 */
@Composable
fun AppNavigation(
    appViewModel: AppViewModel = androidx.lifecycle.viewmodel.compose.viewModel(),
    snackbarHostState: androidx.compose.material3.SnackbarHostState = remember { androidx.compose.material3.SnackbarHostState() }
) {
    val isLoggedIn = appViewModel.isLoggedIn.value

    val backStack = rememberNavBackStack(
        if (isLoggedIn) DashboardScreen as NavKey else LoginScreen
    )

    androidx.compose.runtime.CompositionLocalProvider(
        LocalSnackbarHostState provides androidx.compose.material3.SnackbarHostState(),
        LocalNavBackStack provides backStack
    ) {
        androidx.compose.foundation.layout.Box(
            modifier = androidx.compose.ui.Modifier.fillMaxSize()
        ) {
            // Get current role to determine if we show bottom nav or drawer
            val appViewModelLocal = appViewModel
            val currentRole = appViewModel.currentRole.value
            
            // For SUPERADMIN, we use a drawer instead of bottom navigation
            val isSuperAdmin = appViewModel.currentRole.value == com.brontolano.albafintech.data.model.UserRole.SUPERADMIN
            
            androidx.compose.foundation.layout.Box(
                modifier = androidx.compose.ui.Modifier.fillMaxSize()
            ) {
                NavContent(
                    backStack = backStack,
                    onBack = {
                        if (backStack.size > 1) {
                            backStack.removeLastOrNull()
                        }
                    },
                    appViewModel = appViewModel
                )
                
                // Bottom Navigation Bar for non-SUPERADMIN roles
                if (!isSuperAdmin) {
                    BottomNavigationBar(
                        items = getBottomNavItems(),
                        selectedRoute = getSelectedRoute(),
                        onNavigate = { route ->
                            when (route) {
                                "dashboard" -> backStack.replace(DashboardScreen)
                                "transactions" -> backStack.add(TransactionListScreen)
                                "approvals" -> backStack.add(ApprovalsScreen)
                                "profile" -> backStack.add(ProfileScreen)
                            }
                        }
                    )
                }
                
                // Snackbar host at bottom
                androidx.compose.material3.SnackbarHost(
                    hostState = androidx.compose.material3.SnackbarHostState(),
                    modifier = androidx.compose.ui.Modifier.align(androidx.compose.ui.Alignment.BottomCenter)
                )
            }
        }
    }

    BackHandler(enabled = backStack.size > 1) {
        if (backStack.size > 1) {
            backStack.removeLastOrNull()
        }
    }
}

@Composable
fun getSelectedRoute(): String {
    val backStack = androidx.navigation3.runtime.rememberNavBackStack(
        LoginScreen as androidx.navigation3.runtime.NavKey
    )
    val currentKey = backStack.lastOrNull()
    return when (currentKey) {
        is DashboardScreen -> "dashboard"
        is TransactionListScreen -> "transactions"
        is ApprovalsScreen -> "approvals"
        is ProfileScreen -> "profile"
        else -> "dashboard"
    }
}

@Composable
fun getBottomNavItems(): List<com.brontolano.albafintech.ui.components.NavItem> {
    return listOf(
        com.brontolano.albafintech.ui.components.NavItem(
            title = "Dashboard",
            selectedIcon = androidx.compose.material.icons.rounded.Dashboard,
            unselectedIcon = androidx.compose.material.icons.outlined.Dashboard,
            route = "dashboard"
        ),
        com.brontolano.albafintech.ui.components.NavItem(
            title = "Transaksi",
            selectedIcon = androidx.compose.material.icons.rounded.ReceiptLong,
            unselectedIcon = androidx.compose.material.icons.outlined.ReceiptLong,
            route = "transactions"
        ),
        com.brontolano.albafintech.ui.components.NavItem(
            title = "Persetujuan",
            selectedIcon = androidx.compose.material.icons.rounded.PendingActions,
            unselectedIcon = androidx.compose.material.icons.outlined.PendingActions,
            route = "approvals"
        ),
        com.brontolano.albafintech.ui.components.NavItem(
            title = "Profil",
            selectedIcon = androidx.compose.material.icons.rounded.Person,
            unselectedIcon = androidx.compose.material.icons.outlined.Person,
            route = "profile"
        )
    )
}

@Composable
@Preview(showBackground = true)
fun AppNavigationPreview() {
    com.brontolano.albafintech.ui.theme.AlbaFintechTheme {
        AppNavigation()
    }
}