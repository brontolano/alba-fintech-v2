package com.brontolano.albafintech.ui.screens

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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import com.brontolano.albafintech.data.models.Transaction
import com.brontolano.albafintech.ui.viewmodel.TransactionViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReportsScreen(
    navController: NavHostController,
    transactionViewModel: TransactionViewModel = viewModel()
) {
    val txListState by transactionViewModel.listState.collectAsState()

    LaunchedEffect(Unit) {
        if (txListState.transactions.isEmpty()) {
            transactionViewModel.loadTransactions()
        }
    }

    val income = txListState.transactions
        .filter { it.type == "INCOME" && it.status in listOf("APPROVED", "PENDING") }
        .sumOf { it.amount }
    val expense = txListState.transactions
        .filter { it.type == "EXPENSE" && it.status in listOf("APPROVED", "PENDING") }
        .sumOf { it.amount }
    val net = income - expense

    var periodExpanded by remember { mutableStateOf(false) }
    val periods = listOf("Bulan ini", "30 Hari Terakhir", "Semua")

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(title = { Text("Laporan") })
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
        ) {
            Box {
                OutlinedButton(onClick = { periodExpanded = true }) {
                    Text("Bulan ini")
                }
                DropdownMenu(expanded = periodExpanded, onDismissRequest = { periodExpanded = false }) {
                    periods.forEach { p ->
                        DropdownMenuItem(text = { Text(p) }, onClick = { periodExpanded = false })
                    }
                }
            }
            Spacer(Modifier.height(16.dp))

            ReportSummaryCard(title = "Total Pemasukan", amount = income, color = Color(0xFF059669))
            Spacer(Modifier.height(8.dp))
            ReportSummaryCard(title = "Total Pengeluaran", amount = expense, color = Color(0xFFDC2626))
            Spacer(Modifier.height(8.dp))
            ReportSummaryCard(title = "Selisih", amount = net, color = if (net >= 0) Color(0xFF059669) else Color(0xFFDC2626))

            Spacer(Modifier.height(24.dp))

            Text(
                "Transaksi Terbaru",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
            )

            if (txListState.transactions.isEmpty()) {
                Text("Belum ada data transaksi", modifier = Modifier.padding(16.dp))
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxWidth(),
                    contentPadding = PaddingValues(16.dp)
                ) {
                    items(txListState.transactions.take(10), key = { it.id }) { tx ->
                        ReportTransactionItem(tx = tx)
                    }
                }
            }
        }
    }
}

@Composable
fun ReportSummaryCard(title: String, amount: Double, color: Color) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
        elevation = CardDefaults.cardElevation(4.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium)
            Text(
                formatCurrency(amount),
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = color
            )
        }
    }
}

@Composable
fun ReportTransactionItem(tx: Transaction) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Column {
            Text(tx.description, style = MaterialTheme.typography.bodyMedium)
            Text(formatDateShort(tx.createdAt), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Column(horizontalAlignment = Alignment.End) {
            Text(
                formatCurrency(tx.amount),
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Bold,
                color = if (tx.type == "INCOME") Color(0xFF059669) else Color(0xFFDC2626)
            )
            StatusBadge(status = tx.status)
        }
    }
}
