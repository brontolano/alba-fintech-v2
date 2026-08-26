package com.brontolano.albafintech.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.brontolano.albafintech.data.models.Approval

@Composable
fun ApprovalListScreen() {
    val sampleApprovals = remember {
        listOf(
            Approval("a1", "tx-1", null, "PENDING", null, "2024-06-01", "Butuh persetujuan"),
            Approval("a2", "tx-2", null, "APPROVED", "mgr-1", "2024-06-03", "Disetujui")
        )
    }
    LazyColumn(modifier = Modifier.fillMaxSize()) {
        items(sampleApprovals) { approval ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                elevation = CardDefaults.cardElevation(4.dp)
            ) {
                Column(Modifier.padding(12.dp)) {
                    Text(approval.notes ?: "Persetujuan transaksi", style = MaterialTheme.typography.titleMedium)
                    Text("Status: ${approval.status}", color = when (approval.status) {
                        "APPROVED" -> MaterialTheme.colorScheme.primary
                        "PENDING" -> MaterialScheme.colorScheme.secondary
                        else -> MaterialTheme.colorScheme.onSurfaceVariant
                    })
                }
            }
        }
    }
}
