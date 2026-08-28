package com.brontolano.albafintech.ui.screens

import android.annotation.SuppressLint
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.material.icons.Icons
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.brontolano.albafintech.data.remote.ApiClient
import com.brontolano.albafintech.ui.viewmodel.AuthViewModel

@Composable
fun MainScreen(
    authViewModel: AuthViewModel = viewModel()
) {
    val state = authViewModel.uiState.collectAsState()

    // Register session-expiry callback so the UI redirects to login on 401
    LaunchedEffect(Unit) {
        ApiClient.setSessionExpiredCallback {
            authViewModel.checkLoginState()
        }
    }

    when {
        state.value.isLoading -> LoadingScreen()
        !state.value.isLoggedIn -> LoginScreen(authViewModel)
        else -> AppScaffold(authViewModel)
    }
}

/**
 * Fullscreen loading spinner shown during initial auth check.
 */
@Composable
private fun LoadingScreen() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        CircularProgressIndicator()
    }
}

/**
 * Top-level scaffold with CenterAlignedTopAppBar, bottom navigation bar,
 * floating action button, and the NavHost handling screen switching.
 */
@OptIn(ExperimentalMaterial3Api::class)
@SuppressLint("UnusedMaterial3ScaffoldPadding")
@Composable
fun AppScaffold(
    vm: AuthViewModel,
    navController: NavHostController = rememberNavController()
) {
    val navState = vm.uiState.collectAsState()
    val role = navState.value.role
    val items = bottomNavItemsForRole(role)
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route

    val isSuperAdmin = role == "SUPERADMIN"

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text("Alba FIntech") }
            )
        },
        floatingActionButton = {
            if (currentRoute == Screen.Transactions.route && !isSuperAdmin) {
                FloatingActionButton(onClick = {
                    navController.navigate(Screen.AddTransaction.route) {
                        launchSingleTop = true
                    }
                }) {
                    Icon(Screen.AddTransaction.icon, contentDescription = Screen.AddTransaction.title)
                }
            }
        },
        bottomBar = {
            if (items.isNotEmpty()) {
                NavigationBar {
                    items.forEach { screen ->
                        val selected = currentRoute?.startsWith(screen.route) == true
                        NavigationBarItem(
                            icon = { Icon(screen.icon, contentDescription = null) },
                            label = { Text(screen.title) },
                            selected = selected,
                            onClick = {
                                navController.navigate(screen.route) {
                                    launchSingleTop = true
                                    popUpTo(navController.graph.startDestinationId) {
                                        saveState = true
                                    }
                                    restoreState = true
                                }
                            }
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            NavHost(
                navController = navController,
                startDestination = Screen.Home.route,
                modifier = Modifier.fillMaxSize()
            ) {
                composable(Screen.Home.route) { HomeScreen(navController = navController, authViewModel = vm) }
                composable(Screen.Lembaga.route) { LembagaListScreen(navController = navController) }
                composable(Screen.Units.route) { UnitListScreen(navController = navController) }
                composable(Screen.Transactions.route) { TransactionListScreen(navController = navController) }
                composable(
                    route = Screen.TransactionDetail.route,
                    arguments = listOf(navArgument("id") { type = NavType.StringType })
                ) { backStackEntry ->
                    val txId = backStackEntry.arguments?.getString("id") ?: ""
                    TransactionDetailScreen(
                        transactionId = txId,
                        navController = navController,
                        authViewModel = vm
                    )
                }
                composable(Screen.Approvals.route) { ApprovalListScreen(navController = navController) }
                composable(Screen.Reports.route) { ReportsScreen(navController = navController) }
                composable(Screen.Account.route) { AccountScreen(authViewModel = vm) }
                composable(Screen.Notifications.route) { NotificationListScreen() }
                composable(Screen.AddTransaction.route) { AddTransactionScreen(navController = navController, authViewModel = vm) }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(vm: AuthViewModel) {
    val state = vm.uiState.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text("Alba FIntech", style = MaterialTheme.typography.headlineLarge)
        Text("Masuk ke akun Anda", style = MaterialTheme.typography.bodyMedium)

        Spacer(Modifier.height(32.dp))

        LoginForm(onLogin = { email, password ->
            vm.login(email, password)
        })

        if (state.value.error != null) {
            Spacer(Modifier.height(8.dp))
            Text(
                state.value.error!!,
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall
            )
        }

        if (state.value.isLoading) {
            Spacer(Modifier.height(16.dp))
            CircularProgressIndicator()
        }
    }
}
