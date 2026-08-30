package com.brontolano.albafintech.ui.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ExitToApp
import androidx.compose.material.icons.rounded.AccountBalance
import androidx.compose.material.icons.rounded.ArrowDownward
import androidx.compose.material.icons.rounded.ArrowUpward
import androidx.compose.material.icons.rounded.Business
import androidx.compose.material.icons.rounded.PendingActions
import androidx.compose.material.icons.rounded.ReceiptLong
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Badge
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.VerticalDivider
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.brontolano.albafintech.data.model.DashboardStats
import com.brontolano.albafintech.data.model.TransactionStatus
import com.brontolano.albafintech.data.model.TransactionType
import com.brontolano.albafintech.data.model.UserRole
import com.brontolano.albafintech.ui.components.BottomNavHeight
import com.brontolano.albafintech.ui.navigation.AppViewModel
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    viewModel: DashboardViewModel,
    appViewModel: AppViewModel,
    onNavigateToTransactions: () -> Unit,
    onNavigateToTransactionDetail: (Long) -> Unit,
    onNavigateToCreateTransaction: () -> Unit,
    onNavigateToEditTransaction: (Long) -> Unit,
    onLogout: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val currentRole by appViewModel.currentRole.collectAsState()
    val currentUser by appViewModel.currentUser.collectAsState()

    LaunchedEffect(currentRole, currentUser?.unitId) {
        viewModel.loadDashboardStats(currentRole, currentUser?.unitId)
    }

    Scaffold(
        topBar = {
            DashboardTopBar(
                title = "ALBA Finance",
                role = currentRole,
                onLogout = onLogout
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(MaterialTheme.colorScheme.background)
        ) {
            when {
                uiState.isLoading && uiState.stats == null -> {
                    androidx.compose.material3.CircularProgressIndicator(
                        modifier = Modifier.align(Alignment.Center),
                        strokeWidth = 4.dp,
                        color = MaterialTheme.colorScheme.primary,
                        strokeCap = StrokeCap.Round
                    )
                }
                uiState.error != null && uiState.stats == null -> {
                    Text(
                        text = uiState.error ?: "An error occurred",
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier.align(Alignment.Center)
                    )
                }
                else -> {
                    val stats = uiState.stats ?: DashboardStats()
                    val scrollState = rememberScrollState()

                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .verticalScroll(scrollState)
                            // Lift content above the bottom navigation bar.
                            .padding(start = 16.dp, top = 16.dp, end = 16.dp, bottom = 16.dp + BottomNavHeight)
                    ) {
                        when (currentRole) {
                            UserRole.SUPERADMIN -> SuperAdminDashboard(
                                stats = stats,
                                onNavigateToTransactions = onNavigateToTransactions,
                                onNavigateToCreateTransaction = onNavigateToCreateTransaction,
                                onNavigateToTransactionDetail = onNavigateToTransactionDetail,
                                onNavigateToEditTransaction = onNavigateToEditTransaction
                            )
                            UserRole.PIMPINAN -> PimpinanDashboard(
                                stats = stats,
                                onNavigateToTransactions = onNavigateToTransactions
                            )
                            UserRole.MANAGER -> ManagerDashboard(
                                stats = stats,
                                onNavigateToTransactions = onNavigateToTransactions,
                                onNavigateToCreateTransaction = onNavigateToCreateTransaction,
                                onNavigateToTransactionDetail = onNavigateToTransactionDetail,
                                onNavigateToEditTransaction = onNavigateToEditTransaction
                            )
                            UserRole.STAFF -> StaffDashboard(
                                stats = stats,
                                onNavigateToTransactions = onNavigateToTransactions,
                                onNavigateToCreateTransaction = onNavigateToCreateTransaction,
                                onNavigateToTransactionDetail = onNavigateToTransactionDetail
                            )
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardTopBar(
    title: String,
    role: UserRole,
    onLogout: () -> Unit
) {
    CenterAlignedTopAppBar(
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(text = title)
                Spacer(modifier = Modifier.width(8.dp))
                Badge(
                    containerColor = when (role) {
                        UserRole.SUPERADMIN -> MaterialTheme.colorScheme.tertiary
                        UserRole.PIMPINAN -> MaterialTheme.colorScheme.primary
                        UserRole.MANAGER -> MaterialTheme.colorScheme.secondary
                        UserRole.STAFF -> MaterialTheme.colorScheme.secondary
                    },
                    contentColor = when (role) {
                        UserRole.SUPERADMIN -> MaterialTheme.colorScheme.onTertiary
                        UserRole.PIMPINAN -> MaterialTheme.colorScheme.onPrimary
                        UserRole.MANAGER -> MaterialTheme.colorScheme.onSecondary
                        UserRole.STAFF -> MaterialTheme.colorScheme.onSecondary
                    }
                ) {
                    Text(
                        text = role.displayName,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        },
        actions = {
            IconButton(onClick = onLogout) {
                Icon(
                    imageVector = Icons.AutoMirrored.Rounded.ExitToApp,
                    contentDescription = "Logout",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        },
        colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLowest,
            titleContentColor = MaterialTheme.colorScheme.onSurface,
            actionIconContentColor = MaterialTheme.colorScheme.onSurfaceVariant
        )
    )
}

@Composable
private fun SuperAdminDashboard(
    stats: DashboardStats,
    onNavigateToTransactions: () -> Unit,
    onNavigateToCreateTransaction: () -> Unit,
    onNavigateToTransactionDetail: (Long) -> Unit,
    onNavigateToEditTransaction: (Long) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        StatCardsRow(stats = stats)

        FinancialSummaryCard(
            title = "Total Saldo",
            amount = formatCurrency(stats.totalAmount),
            icon = Icons.Rounded.AccountBalance,
            modifier = Modifier.height(150.dp)
        )

        Text(
            text = "Unit Breakdown",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.padding(vertical = 8.dp)
        )
        stats.unitBreakdowns.forEach { unit ->
            UnitBreakdownCard(unit = unit)
        }

        Text(
            text = "Aktivitas Terbaru",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.padding(vertical = 8.dp)
        )
        RecentTransactionsMiniList(
            transactions = stats.recentTransactions,
            onTransactionClick = onNavigateToTransactionDetail
        )

        MonthlyStatsChart(stats = stats.monthlyStats)
    }
}

@Composable
private fun PimpinanDashboard(
    stats: DashboardStats,
    onNavigateToTransactions: () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        ExecutiveSummaryRow(stats = stats)

        Card(
            modifier = Modifier
                .fillMaxWidth()
                .height(120.dp),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.primaryContainer
            )
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(20.dp)
            ) {
                Text(
                    text = "Total Transaksi",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f)
                )
                Text(
                    text = formatNumber(stats.totalTransactions),
                    style = MaterialTheme.typography.displayMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
                Text(
                    text = "butuh persetujuan",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f)
                )
            }
        }

        MonthlyStatsChart(stats = stats.monthlyStats)

        Text(
            text = "Aktivitas Terbaru",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.padding(vertical = 8.dp)
        )
        RecentTransactionsMiniList(
            transactions = stats.recentTransactions,
            onTransactionClick = { }
        )
    }
}

@Composable
private fun ManagerDashboard(
    stats: DashboardStats,
    onNavigateToTransactions: () -> Unit,
    onNavigateToCreateTransaction: () -> Unit,
    onNavigateToTransactionDetail: (Long) -> Unit,
    onNavigateToEditTransaction: (Long) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        val firstUnit = stats.unitBreakdowns.firstOrNull()
        FinancialSummaryCard(
            title = "Saldo Unit",
            amount = firstUnit?.let { formatCurrency(it.balance) } ?: "Rp 0",
            debit = firstUnit?.let { formatCurrency(it.debit) },
            credit = firstUnit?.let { formatCurrency(it.credit) },
            icon = Icons.Rounded.AccountBalance,
            modifier = Modifier.height(170.dp)
        )

        StatCardsRow(stats = stats)

        PendingApprovalsSection(stats = stats)

        Text(
            text = "Transaksi Terbaru",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.padding(vertical = 8.dp)
        )
        RecentTransactionsMiniList(
            transactions = stats.recentTransactions,
            onTransactionClick = onNavigateToTransactionDetail
        )

        MonthlyStatsChart(stats = stats.monthlyStats)
    }
}

@Composable
private fun StaffDashboard(
    stats: DashboardStats,
    onNavigateToTransactions: () -> Unit,
    onNavigateToCreateTransaction: () -> Unit,
    onNavigateToTransactionDetail: (Long) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        StatCardsRow(stats = stats)

        val items = listOf(
            StatItem("Total Transaksi", stats.totalTransactions.toString(), Icons.Rounded.ReceiptLong),
            StatItem("Menunggu Persetujuan", stats.pendingApprovals.toString(), Icons.Rounded.PendingActions)
        )
        StatCardsRowFromList(items)

        Text(
            text = "Riwayat Terbaru",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.padding(vertical = 8.dp)
        )
        RecentTransactionsMiniList(
            transactions = stats.recentTransactions,
            onTransactionClick = onNavigateToTransactionDetail
        )

        MonthlyStatsCards(stats = stats.monthlyStats)
    }
}

@Composable
fun StatCardsRow(stats: DashboardStats) {
    val items = listOf(
        StatItem("Total Unit", stats.totalUnits.toString(), Icons.Rounded.Business),
        StatItem("Total Transaksi", formatNumber(stats.totalTransactions), Icons.Rounded.ReceiptLong),
        StatItem("Total Jumlah", formatCurrency(stats.totalAmount), Icons.Rounded.AccountBalance)
    )
    StatCardsRowFromList(items)
}

@Composable
fun StatCardsRowFromList(items: List<StatItem>) {
    items.chunked(2).forEach { rowItems ->
        Row(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            rowItems.forEach { item ->
                SummaryCard(
                    title = item.title,
                    value = item.value,
                    icon = item.icon,
                    iconTint = item.iconTint,
                    modifier = Modifier
                        .weight(1f)
                        .height(100.dp)
                )
            }
            if (rowItems.size == 1) {
                Spacer(modifier = Modifier.weight(1f))
            }
        }
        Spacer(modifier = Modifier.height(12.dp))
    }
}

data class StatItem(
    val title: String,
    val value: String,
    val icon: ImageVector,
    val iconTint: Color? = null
)

@Composable
fun UnitBreakdownCard(unit: com.brontolano.albafintech.data.model.UnitBreakdown) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .height(100.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLowest
        ),
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Text(
                    text = unit.unitName,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = formatCurrency(unit.balance),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "+${formatCurrency(unit.debit)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.tertiary
                )
                Text(
                    text = "-${formatCurrency(unit.credit)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error
                )
            }
        }
    }
}

@Composable
fun PendingApprovalsSection(stats: DashboardStats) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .height(140.dp),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLowest
        ),
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Pengajuan Persetujuan",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                if (stats.pendingApprovals > 0) {
                    Badge(
                        containerColor = MaterialTheme.colorScheme.errorContainer,
                        contentColor = MaterialTheme.colorScheme.onErrorContainer
                    ) {
                        Text("${stats.pendingApprovals} Pending")
                    }
                }
            }
            Text(
                text = "Anda memiliki ${stats.pendingApprovals} transaksi yang menunggu persetujuan.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 8.dp)
            )
        }
    }
}

@Composable
fun MonthlyStatsChart(stats: List<com.brontolano.albafintech.data.model.MonthlyStat>) {
    if (stats.isEmpty()) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .height(180.dp),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceContainerLowest
            ),
            border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
        ) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "Belum ada data bulanan",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center
                )
            }
        }
        return
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .height(220.dp),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLowest
        ),
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp)
        ) {
            Text(
                text = "Statistik Bulanan",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.padding(bottom = 12.dp)
            )

            val maxIncome = stats.maxOfOrNull { maxOf(it.income, it.expense) } ?: 0.0
            if (maxIncome > 0) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    horizontalArrangement = Arrangement.SpaceEvenly,
                    verticalAlignment = Alignment.Bottom
                ) {
                    stats.take(6).forEach { stat ->
                        BarChartItem(
                            label = stat.month.take(3),
                            incomeValue = (stat.income / maxIncome).toFloat(),
                            expenseValue = (stat.expense / maxIncome).toFloat()
                        )
                    }
                }
            }

            Row(
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(top = 8.dp)
            ) {
                ChartLegendDot(color = MaterialTheme.colorScheme.tertiary, label = "Pemasukan")
                VerticalDivider(modifier = Modifier.height(16.dp))
                ChartLegendDot(color = MaterialTheme.colorScheme.error, label = "Pengeluaran")
            }
        }
    }
}

@Composable
fun BarChartItem(
    label: String,
    incomeValue: Float,
    expenseValue: Float
) {
    val safeIncome = incomeValue.coerceIn(0.05f, 1f)
    val safeExpense = expenseValue.coerceIn(0.05f, 1f)
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Bottom,
        modifier = Modifier
            .width(32.dp)
            .height(140.dp)
    ) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(2.dp),
            verticalAlignment = Alignment.Bottom,
            modifier = Modifier
                .width(28.dp)
                .height(120.dp)
        ) {
            Box(
                modifier = Modifier
                    .weight(safeIncome)
                    .fillMaxWidth()
                    .background(
                        color = MaterialTheme.colorScheme.tertiary,
                        shape = RoundedCornerShape(topStart = 4.dp, topEnd = 2.dp)
                    )
            )
            Box(
                modifier = Modifier
                    .weight(safeExpense)
                    .fillMaxWidth()
                    .background(
                        color = MaterialTheme.colorScheme.error,
                        shape = RoundedCornerShape(topStart = 2.dp, topEnd = 4.dp)
                    )
            )
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            fontSize = 10.sp
        )
    }
}

@Composable
fun ChartLegendDot(color: Color, label: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            modifier = Modifier
                .size(8.dp)
                .background(color, CircleShape)
        )
        Spacer(modifier = Modifier.width(4.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            fontSize = 11.sp
        )
    }
}

@Composable
fun MonthlyStatsCards(stats: List<com.brontolano.albafintech.data.model.MonthlyStat>) {
    if (stats.isEmpty()) return

    val recent = stats.take(3)
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        recent.forEach { stat ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(70.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceContainerLowest
                ),
                border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = stat.month,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium
                    )
                    Column(horizontalAlignment = Alignment.End) {
                        Text(
                            text = formatCurrency(stat.income),
                            style = MaterialTheme.typography.bodySmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.tertiary
                        )
                        Text(
                            text = formatCurrency(stat.expense),
                            style = MaterialTheme.typography.bodySmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.error
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun ExecutiveSummaryRow(stats: DashboardStats) {
    val income = stats.unitBreakdowns.sumOf { it.debit }
    val expense = stats.unitBreakdowns.sumOf { it.credit }
    val net = income - expense

    val items = listOf(
        StatItem("Total Pemasukan", formatCurrency(income), Icons.Rounded.ArrowDownward, MaterialTheme.colorScheme.tertiary),
        StatItem("Total Pengeluaran", formatCurrency(expense), Icons.Rounded.ArrowUpward, MaterialTheme.colorScheme.error),
        StatItem("Laba Bersih", formatCurrency(net), Icons.Rounded.AccountBalance, MaterialTheme.colorScheme.primary)
    )
    StatCardsRowFromList(items)
}

@Composable
fun RecentTransactionsMiniList(
    transactions: List<com.brontolano.albafintech.data.model.TransactionSummary>,
    onTransactionClick: (Long) -> Unit
) {
    if (transactions.isEmpty()) {
        Text(
            text = "Belum ada transaksi",
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.padding(vertical = 16.dp),
            textAlign = TextAlign.Center
        )
        return
    }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        transactions.take(5).forEach { tx ->
            TransactionMiniItem(
                transaction = tx,
                onClick = { onTransactionClick(tx.id) }
            )
        }
    }
}

@Composable
fun TransactionMiniItem(
    transaction: com.brontolano.albafintech.data.model.TransactionSummary,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLowest
        ),
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = transaction.description,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = "${transaction.unitName} • ${formatDate(transaction.date)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                val isIncome = transaction.type == TransactionType.INCOME
                Text(
                    text = "${if (isIncome) "+" else "-"} ${formatCurrency(transaction.amount)}",
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.Bold,
                    color = if (isIncome) MaterialTheme.colorScheme.tertiary else MaterialTheme.colorScheme.error
                )
                StatusChip(status = transaction.status)
            }
        }
    }
}

@Composable
fun StatusChip(status: TransactionStatus) {
    val (text, color, backgroundColor) = when (status) {
        TransactionStatus.APPROVED -> Triple("Disetujui", MaterialTheme.colorScheme.onTertiary, MaterialTheme.colorScheme.tertiaryContainer)
        TransactionStatus.PENDING -> Triple("Pending", MaterialTheme.colorScheme.onSecondaryContainer, MaterialTheme.colorScheme.secondaryContainer)
        TransactionStatus.REJECTED -> Triple("Ditolak", MaterialTheme.colorScheme.onErrorContainer, MaterialTheme.colorScheme.errorContainer)
        TransactionStatus.DRAFT -> Triple("Draft", MaterialTheme.colorScheme.onSurfaceVariant, MaterialTheme.colorScheme.surfaceContainerHigh)
    }
    Badge(
        containerColor = backgroundColor,
        contentColor = color,
        modifier = Modifier
            .height(20.dp)
            .padding(start = 4.dp)
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.bodySmall,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold
        )
    }
}

private fun formatCurrency(amount: Double): String {
    val formatter = NumberFormat.getCurrencyInstance(Locale("id", "ID"))
    formatter.minimumFractionDigits = 0
    formatter.maximumFractionDigits = 0
    return formatter.format(amount)
}

private fun formatNumber(value: Long): String {
    return NumberFormat.getInstance(Locale("id", "ID")).format(value)
}

private fun formatDate(dateString: String): String {
    if (dateString.isBlank()) return ""
    return try {
        val parts = dateString.split("T")
        if (parts.isNotEmpty()) {
            val dateParts = parts[0].split("-")
            if (dateParts.size == 3) {
                "${dateParts[2]}/${dateParts[1]}/${dateParts[0]}"
            } else {
                dateString
            }
        } else {
            dateString
        }
    } catch (_: Exception) {
        dateString
    }
}

private val UserRole.displayName: String
    get() = when (this) {
        UserRole.SUPERADMIN -> "Super Admin"
        UserRole.PIMPINAN -> "Pimpinan"
        UserRole.MANAGER -> "Manager"
        UserRole.STAFF -> "Staff"
    }
