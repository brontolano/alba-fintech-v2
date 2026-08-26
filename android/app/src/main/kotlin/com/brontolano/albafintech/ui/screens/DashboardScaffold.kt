package com.brontolano.albafintech.ui.screens

import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.brontolano.albafintech.ui.viewmodel.AuthViewModel

data class BottomNavItem(
    val title: String,
    val icon: ImageVector,
    val route: String,
    val roles: List<String> = emptyList()
)

@Composable
fun MainScreen(
    authViewModel: AuthViewModel = viewModel()
) {
    val state = authViewModel.uiState.collectAsState()

    if (state.value.isLoading) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator()
        }
        return
    }

    if (!state.value.isLoggedIn) {
        LoginScreen(authViewModel)
        return
    }

    val role = state.value.role
    when (role) {
        "SUPERADMIN" -> SuperadminDashboard(authViewModel)
        "PIMPINAN" -> PimpinanDashboard(authViewModel)
        "MANAGER" -> ManagerDashboard(authViewModel)
        "STAFF" -> StaffDashboard(authViewModel)
        else -> LoginScreen(authViewModel)
    }
}

@Composable
private fun SuperadminDashboard(vm: AuthViewModel) {
    DashboardScaffold(
        vm = vm,
        role = "Superadmin",
        items = listOf(
            BottomNavItem("Beranda", Icons.Default.Home, "home"),
            BottomNavItem("Lembaga", Icons.Default.Building, "lembaga", listOf("SUPERADMIN")),
            BottomNavItem("Unit", Icons.Default.Domain, "units"),
            BottomNavItem("Transaksi", Icons.Default.Receipt, "transactions"),
            BottomNavItem("Persetujuan", Icons.Default.Task, "approvals"),
            BottomNavItem("Akun", Icons.Default.Person, "account")
        ),
        content = { TransactionListScreen() }
    )
}

@Composable
private fun ManagerDashboard(vm: AuthViewModel) {
    DashboardScaffold(
        vm = vm,
        role = "Manager",
        items = listOf(
            BottomNavItem("Beranda", Icons.Default.Home, "home"),
            BottomNavItem("Transaksi", Icons.Default.Receipt, "transactions"),
            BottomNavItem("Persetujuan", Icons.Default.Task, "approvals"),
            BottomNavItem("Akun", Icons.Default.Person, "account")
        ),
        content = { ApprovalListScreen() }
    )
}

@Composable
private fun PimpinanDashboard(vm: AuthViewModel) {
    DashboardScaffold(
        vm = vm,
        role = "Pimpinan",
        items = listOf(
            BottomNavItem("Beranda", Icons.Default.Home, "home"),
            BottomNavItem("Transaksi", Icons.Default.Receipt, "transactions"),
            BottomNavItem("Laporan", Icons.Default.Analytics, "reports"),
            BottomNavItem("Akun", Icons.Default.Person, "account")
        ),
        content = { TransactionListScreen() }
    )
}

@Composable
private fun StaffDashboard(vm: AuthViewModel) {
    DashboardScaffold(
        vm = vm,
        role = "Staff",
        items = listOf(
            BottomNavItem("Beranda", Icons.Default.Home, "home"),
            BottomNavItem("Transaksi", Icons.Default.Add, "transactions"),
            BottomNavItem("Akun", Icons.Default.Person, "account")
        ),
        content = { TransactionListScreen() }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScaffold(
    vm: AuthViewModel,
    role: String,
    items: List<BottomNavItem>,
    content: @Composable () -> Unit
) {
    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(title = { Text("Alba Fintech - $role") })
        },
        floatingActionButton = {
            if (items.any { it.route == "transactions" }) {
                FloatingActionButton(onClick = { /* TODO: create transaction */ }) {
                    Icon(Icons.Default.Add, contentDescription = "Transaksi")
                }
            }
        },
        bottomBar = {
            NavigationBar {
                items.forEach { item ->
                    if (item.roles.isEmpty() || item.roles.any { it == getRoleCode(role) }) {
                        NavigationBarItem(
                            icon = { Icon(item.icon, contentDescription = null) },
                            label = { Text(item.title) },
                            selected = false,
                            onClick = { }
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        Box(modifier = Modifier.padding(innerPadding).fillMaxSize()) {
            content()
        }
    }
}

@Composable
fun LoginScreen(vm: AuthViewModel) {
    val state = vm.uiState.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text("Alba Fintech", style = MaterialTheme.typography.headlineLarge)
        Text("Masuk ke akun Anda", style = MaterialTheme.typography.bodyMedium)

        Spacer(Modifier.height(32.dp))

        LoginForm(onLogin = { email, password ->
            vm.login(email, password)
        })

        if (state.value.error != null) {
            Text(state.value.error!!, color = MaterialTheme.colorScheme.error)
        }
    }
}

private fun getRoleCode(role: String): String = role.uppercase()
