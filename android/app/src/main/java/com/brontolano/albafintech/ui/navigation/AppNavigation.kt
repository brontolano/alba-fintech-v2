package com.brontolano.albafintech.ui.navigation

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation3.runtime.NavBackStack
import androidx.navigation3.runtime.NavKey
import androidx.navigation3.runtime.rememberNavBackStack
import com.brontolano.albafintech.ui.approvals.ApprovalsScreen
import com.brontolano.albafintech.ui.approvals.ApprovalsViewModel
import com.brontolano.albafintech.ui.auth.AuthViewModel
import com.brontolano.albafintech.ui.auth.LoginScreen
import com.brontolano.albafintech.ui.components.AlbaBottomNavItems
import com.brontolano.albafintech.ui.components.BottomNavigationBar
import com.brontolano.albafintech.ui.dashboard.DashboardScreen
import com.brontolano.albafintech.ui.dashboard.DashboardViewModel
import com.brontolano.albafintech.ui.profile.ProfileScreen
import com.brontolano.albafintech.ui.transaction.CreateTransactionScreen
import com.brontolano.albafintech.ui.transaction.CreateTransactionViewModel
import com.brontolano.albafintech.ui.transaction.EditTransactionScreen
import com.brontolano.albafintech.ui.transaction.TransactionDetailScreen
import com.brontolano.albafintech.ui.transaction.TransactionListScreen
import com.brontolano.albafintech.ui.transaction.TransactionViewModel
import com.brontolano.albafintech.ui.theme.AlbaFintechTheme

/**
 * CompositionLocal for the navigation back stack.
 * Allows any composable to navigate by accessing the back stack.
 */
val LocalNavBackStack = compositionLocalOf<NavBackStack<NavKey>> {
    error("NavBackStack not provided")
}

/**
 * Local provider for the SnackbarHostState so any composable can show snackbars.
 */
val LocalSnackbarHostState = compositionLocalOf<SnackbarHostState> {
    error("SnackbarHostState not provided")
}

/**
 * The top-level destinations that own a slot in the bottom navigation bar.
 * Any other key (Login, detail/create/edit screens) hides the bar.
 */
private val TopLevelRoutes: Set<NavKey> = setOf(
    DashboardScreen,
    TransactionListScreen,
    ApprovalsScreen,
    ProfileScreen
)

/**
 * Maps a back-stack key to the bottom-bar route string used to track the
 * selected item. Falls back to the dashboard route for non-tab destinations.
 */
internal fun routeFor(key: NavKey?): String = when (key) {
    is DashboardScreen -> "dashboard"
    is TransactionListScreen -> "transactions"
    is ApprovalsScreen -> "approvals"
    is ProfileScreen -> "profile"
    else -> "dashboard"
}

/**
 * Maps a bottom-bar route string back to its [NavKey] destination.
 */
internal fun keyForRoute(route: String): NavKey = when (route) {
    "transactions" -> TransactionListScreen
    "approvals" -> ApprovalsScreen
    "profile" -> ProfileScreen
    else -> DashboardScreen
}

/**
 * Renders the current destination based on the top of the [NavBackStack].
 * This is state-driven Navigation 3 rendering: the [backStack] is a
 * `rememberNavBackStack` (a serializable, observable list of [NavKey]s) and
 * every navigation event simply mutates that list.
 */
@Composable
fun NavContent(
    backStack: NavBackStack<NavKey>,
    onBack: () -> Unit,
    appViewModel: AppViewModel
) {
    // ViewModels are scoped to the Activity (the enclosing NavDisplay/back
    // stack host). They are created eagerly so the @Composable context is
    // available when constructing each screen.
    val authViewModel: AuthViewModel = viewModel()
    val dashboardViewModel: DashboardViewModel = viewModel()
    val approvalsViewModel: ApprovalsViewModel = viewModel()
    val transactionViewModel: TransactionViewModel = viewModel()
    val createTransactionViewModel: CreateTransactionViewModel = viewModel()

    val currentKey = backStack.lastOrNull()

    when (currentKey) {
        is LoginScreen -> {
            LoginScreen(
                viewModel = authViewModel,
                onLoginSuccess = {
                    backStack.removeAll { it !is LoginScreen }
                    backStack.add(DashboardScreen)
                }
            )
        }
        is DashboardScreen -> {
            DashboardScreen(
                viewModel = dashboardViewModel,
                appViewModel = appViewModel,
                onNavigateToTransactions = { switchToTopLevel(backStack, TransactionListScreen) },
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
                viewModel = transactionViewModel,
                onNavigateBack = onBack,
                onNavigateToDetail = { id: Long -> backStack.add(TransactionDetailScreen(id)) },
                onNavigateToCreate = { backStack.add(CreateTransactionScreen) }
            )
        }
        is TransactionDetailScreen -> {
            TransactionDetailScreen(
                transactionId = currentKey.id,
                viewModel = transactionViewModel,
                onNavigateBack = onBack,
                onEditTransaction = { id: Long -> backStack.add(EditTransactionScreen(id)) }
            )
        }
        is CreateTransactionScreen -> {
            CreateTransactionScreen(
                viewModel = createTransactionViewModel,
                onNavigateBack = onBack,
                onTransactionCreated = {
                    // Pop back to a top-level destination.
                    while (backStack.size > 1 &&
                        backStack.lastOrNull() !in TopLevelRoutes
                    ) {
                        backStack.removeLastOrNull()
                    }
                }
            )
        }
        is EditTransactionScreen -> {
            EditTransactionScreen(
                id = currentKey.id,
                viewModel = transactionViewModel,
                onNavigateBack = onBack,
                onTransactionUpdated = onBack
            )
        }
        is ApprovalsScreen -> {
            ApprovalsScreen(
                viewModel = approvalsViewModel,
                onNavigateBack = onBack,
                onNavigateToDetail = { id: Long -> backStack.add(TransactionDetailScreen(id)) }
            )
        }
        is ProfileScreen -> {
            ProfileScreen(
                appViewModel = appViewModel,
                onNavigateBack = onBack,
                onLogout = {
                    appViewModel.logout()
                    backStack.removeAll { it !is LoginScreen }
                    backStack.add(LoginScreen)
                }
            )
        }
        else -> {
            Text("Unknown screen")
        }
    }
}

/**
 * Replaces the entire back stack with a single top-level destination, so
 * tapping a bottom-bar item always lands on a clean tab stack.
 */
private fun switchToTopLevel(backStack: NavBackStack<NavKey>, key: NavKey) {
    backStack.removeAll { it != key }
    if (key !in backStack) {
        backStack.add(key)
    }
}

/**
 * Root navigation composable using a Navigation 3 `NavController`-free
 * back stack. The bottom navigation bar is overlaid at the bottom (above the
 * system navigation bar insets) and is only visible on top-level destinations.
 */
@Composable
fun AppNavigation(
    appViewModel: AppViewModel = viewModel(),
    snackbarHostState: SnackbarHostState = remember { SnackbarHostState() }
) {
    val isLoggedIn = appViewModel.isLoggedIn.value

    val backStack = rememberNavBackStack(
        if (isLoggedIn) DashboardScreen as NavKey else LoginScreen
    )

    // Shared "up / back" behavior: pop when there is history, otherwise
    // return to the Dashboard tab.
    val onBack: () -> Unit = {
        if (backStack.size > 1) {
            backStack.removeLastOrNull()
        } else {
            val current = backStack.lastOrNull()
            if (current != null && current != DashboardScreen) {
                switchToTopLevel(backStack, DashboardScreen)
            }
        }
    }

    CompositionLocalProvider(
        LocalSnackbarHostState provides snackbarHostState,
        LocalNavBackStack provides backStack
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            NavContent(
                backStack = backStack,
                onBack = onBack,
                appViewModel = appViewModel
            )

            val currentKey = backStack.lastOrNull()
            val showBottomBar = currentKey in TopLevelRoutes

            if (showBottomBar) {
                BottomNavigationBar(
                    items = AlbaBottomNavItems,
                    selectedRoute = routeFor(currentKey),
                    onNavigate = { route ->
                        val target = keyForRoute(route)
                        if (target != currentKey) switchToTopLevel(backStack, target)
                    },
                    modifier = Modifier.align(Alignment.BottomCenter)
                )
            }
        }
    }

    BackHandler(enabled = backStack.size > 0) {
        onBack()
    }
}

@Composable
@androidx.compose.ui.tooling.preview.Preview(
    showBackground = true,
    device = "spec:parent=mobile,shape=Normal,width=412,height=892,unit=dp,device=pixel_5"
)
fun AppNavigationPreview() {
    val context = androidx.compose.ui.platform.LocalContext.current
    AppContainer.init(context)
    AlbaFintechTheme {
        AppNavigation()
    }
}
