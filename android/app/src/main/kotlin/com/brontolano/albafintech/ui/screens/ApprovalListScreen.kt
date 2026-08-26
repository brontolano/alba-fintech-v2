package com.brontolano.albafintech.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.brontolano.albafintech.AlbaFintechApp
import com.brontolano.albafintech.data.models.Approval
import com.brontolano.albafintech.data.remote.ApiClient
import kotlinx.coroutines.launch

@Composable
fun ApprovalListScreen() {
    val context = LocalContext.current
    val session = (context.applicationContext as AlbaFintechApp).getSessionManager()
    val token = session.getAccessToken() ?: ""
    val scope = rememberCoroutineScope()
    var approvals by remember { mutableStateOf<List<Approval>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    val role = session.getRole() ?: ""
    val canApprove = role in listOf("MANAGER", "STAFF", "PIMPINAN")

    LaunchedEffect(Unit) {
        scope.launch {
            try {
                val api = ApiClient.getClient(context)
                approvals = api.getApprovals("Bearer $token")
            } catch (_: Exception) { approvals = emptyList() }
            loading = false
        }
    }

    if (loading) {
        Box(Modifier.fillMaxSize()) {
            CircularProgressIndicator(Modifier.align(Alignment.Center))
        }
        return
    }

    LazyColumn(modifier = Modifier.fillMaxSize()) {
        items(approvals) { approval ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                elevation = CardDefaults.cardElevation(4.dp)
            ) {
                Column(Modifier.padding(12.dp)) {
                    Text(approval.notes ?: "Persetujuan transaksi", style = MaterialTheme.typography.titleMedium)
                    Text(
                        "Status: ${approval.status}",
                        color = when (approval.status) {
                            "APPROVED" -> Color(0xFF059669)
                            "PENDING" -> Color(0xFFD97706)
                            else -> Color(0xFF6B7280)
                        },
                        style = MaterialTheme.typography.bodySmall
                    )
                    if (canApprove && approval.status == "PENDING") {
                        Spacer(Modifier.height(8.dp))
                        var approving by remember { mutableStateOf(false) }
                        Button(
                            onClick = {
                                approving = true
                                scope.launch {
                                    try {
                                        val api = ApiClient.getClient(context)
                                        api.approveTransaction(token, approval.id)
                                        approvals = approvals.filterNot { it.id == approval.id }
                                    } catch (_: Exception) { }
                                    approving = false
                                }
                            },
                            enabled = !approving
                        ) {
                            if (approving) {
                                CircularProgressIndicator(Modifier.size(16.dp))
                            } else {
                                Text("Setujui")
                            }
                        }
                    }
                }
            }
        }
    }
}
