package com.brontolano.albafintech.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.brontolano.albafintech.data.models.Transaction

@Composable
fun TransactionListScreen() {
    val sampleTx = remember {
        listOf(
            Transaction("1", 50000.0, "Setor Pembelian", "PENDING", "2024-06-01", "unit-1"),
            Transaction("2", 125000.0, "Belanja Modal", "APPROVED", "2024-06-03", "unit-2")
        )
    }
    LazyColumn(modifier = Modifier.fillMaxSize()) {
        items(sampleTx) { tx ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                elevation = CardDefaults.cardElevation(4.dp)
            ) {
                Column(Modifier.padding(12.dp)) {
                    Text(tx.description, style = MaterialTheme.typography.titleMedium)
                    Text("Rp ${"%,.0f".format(tx.amount)}", style = MaterialTheme.typography.bodyLarge)
                    Text("Status: ${tx.status}", style = MaterialTheme.typography.bodySmall)
                }
            }
        }
    }
}
