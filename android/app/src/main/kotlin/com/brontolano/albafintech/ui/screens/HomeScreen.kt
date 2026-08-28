package com.brontolano.albafintech.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.FloatingActionButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.brontolano.albafintech.data.models.Transaction
import com.brontolano.albafintech.data.models.User
import com.brontolano.albafintech.ui.viewmodel.AuthViewModel
import com.brontolano.albafintech.ui.viewmodel.TransactionViewModel

@Composable
fun HomeScreen(
    navController: NavController,
    authViewModel: AuthViewModel
) {
    val authState = authViewModel.uiState.collectAsState()
    val role = authState.value.role
    val user = authState.value.user

    val transactionViewModel: TransactionViewModel = viewModel()
    val txState = transactionViewModel.uiState.collectAsState()

    LaunchedEffect(Unit) {
        transactionViewModel.loadTransactions()
    }

    val transactions = txState.value.transactions
    val approvedCount = transactions.count { it.status == "APPROVED" }
    val pendingCount = transactions.count { it.status == "PENDING" }
    val totalCount = transactions.size

    val totalIncome = transactions
        .filter { it.type == "INCOME" && it.status in listOf("APPROVED", "PENDING") }
        .sumOf { it.amount }
    val totalExpense = transactions
        .filter { it.type == "EXPENSE" && it.status in listOf("APPROVED", "PENDING") }
        .sumOf { it.amount }

    val titleText = when (role) {
        "PIMPINAN" -> "Dashboard Pimpinan"
        "MANAGER" -> "Dashboard Manager"
        "STAFF" -> "Dashboard Staff"
        else -> "Dashboard"
    }

    val statCards = buildStatCards(role, totalCount, approvedCount, pendingCount, totalIncome, totalExpense)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        Text(
            text = "Selamat datang, ${user?.name ?: "User"}!",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = titleText,
            style = MaterialTheme.typography.bodyMedium,
            color = Color.Gray
        )

        Spacer(Modifier.height(16.dp))

        StatCardsGrid(statCards)

        Spacer(Modifier.height(24.dp))

        Text(
            text = "Transaksi Terbaru",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )

        Spacer(Modifier.height(8.dp))

        if (txState.value.isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else if (transactions.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(150.dp),
                contentAlignment = Alignment.Center
            ) {
                Text("Belum ada transaksi", color = Color.Gray)
            }
        } else {
            val recent = transactions.take(5)
            Column(
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                recent.forEach { tx ->
                    TransactionMiniCard(
                        transaction = tx,
                        onClick = {
                            navController.navigate(Screen.TransactionDetail.route.replace("{id}", tx.id)) {
                                launchSingleTop = true
                            }
                        }
                    )
                }
            }
        }
    }
}

data class StatCardData(
    val title: String,
    val value: String,
    val color: Color
)

@Composable
private fun buildStatCards(
    role: String,
    total: Int,
    approved: Int,
    pending: Int,
    income: Double,
    expense: Double
): List<StatCardData> {
    val primary = MaterialTheme.colorScheme.primary
    val secondary = MaterialTheme.colorScheme.secondary
    val tertiary = MaterialTheme.colorScheme.tertiary
    return when (role) {
        "PIMPINAN" -> listOf(
            StatCardData("Total Transaksi", total.toString(), primary),
            StatCardData("Disetujui", approved.toString(), secondary),
            StatCardData("Menunggu", pending.toString(), tertiary),
            StatCardData("Pemasukan", formatCurrency(income), Color(0xFF059669)),
            StatCardData("Pengeluaran", formatCurrency(expense), Color(0xFFDC2626))
        )
        "MANAGER" -> listOf(
            StatCardData("Disetujui", approved.toString(), secondary),
            StatCardData("Menunggu", pending.toString(), tertiary)
        )
        else -> listOf(
            StatCardData("Transaksi Saya", total.toString(), primary),
            StatCardData("Disetujui", approved.toString(), secondary),
            StatCardData("Menunggu", pending.toString(), tertiary)
        )
    }
}

@Composable
fun StatCardsGrid(cards: List<StatCardData>) {
    val columns = 2
    val rows = (cards.size + columns - 1) / columns
    for (rowIndex in 0 until rows) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 4.dp)
        ) {
            val startIdx = rowIndex * columns
            val endIdx = minOf(startIdx + columns, cards.size)
            for (i in startIdx until endIdx) {
                StatCard(
                    stat = cards[i],
                    modifier = Modifier
                        .weight(1f)
                        .height(100.dp)
                )
            }
            val remaining = columns - (endIdx - startIdx)
            repeat(remaining) {
                Spacer(Modifier.weight(1f))
            }
        }
    }
}

@Composable
fun StatCard(stat: StatCardData, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        elevation = CardDefaults.cardElevation(4.dp),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = stat.title,
                style = MaterialTheme.typography.bodySmall,
                color = Color.Gray
            )
            Text(
                text = stat.value,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = stat.color
            )
        }
    }
}

@Composable
fun TransactionMiniCard(transaction: Transaction, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .clickable(onClick = onClick)
            .fillMaxWidth()
            .height(64.dp),
        elevation = CardDefaults.cardElevation(2.dp),
        shape = RoundedCornerShape(8.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = transaction.description,
                style = MaterialTheme.typography.bodyMedium,
                maxLines = 1
            )
            Row(
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = formatCurrency(transaction.amount),
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Bold,
                    color = if (transaction.type == "INCOME") Color(0xFF059669) else Color(0xFFDC2626)
                )
                StatusBadge(status = transaction.status)
            }
        }
    }
}
