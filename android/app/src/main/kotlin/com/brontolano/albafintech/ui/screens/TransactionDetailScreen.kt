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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.brontolano.albafintech.ui.viewmodel.ApprovalViewModel
import com.brontolano.albafintech.ui.viewmodel.AuthViewModel
import com.brontolano.albafintech.ui.viewmodel.TransactionViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TransactionDetailScreen(
    transactionId: String,
    navController: NavController,
    authViewModel: AuthViewModel
) {
    val transactionViewModel: TransactionViewModel = viewModel()
    val state by transactionViewModel.uiState.collectAsState()

    LaunchedEffect(transactionId) {
        transactionViewModel.getTransaction(transactionId)
    }

    val tx = state.transactionDetail
    val authState = authViewModel.uiState.collectAsState()
    val role = authState.value.role

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(title = { Text("Detail Transaksi") })
        }
    ) { innerPadding ->
        if (state.isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else if (tx == null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding),
                contentAlignment = Alignment.Center
            ) {
                Text("Transaksi tidak ditemukan", color = Color.Gray)
            }
        } else {
            DetailContent(
                transaction = tx,
                role = role,
                navController = navController,
                innerPadding = innerPadding
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DetailContent(
    transaction: com.brontolano.albafintech.data.models.Transaction,
    role: String?,
    navController: NavController,
    innerPadding: PaddingValues
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(innerPadding)
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        // Header: type badge + amount
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier.fillMaxWidth()
        ) {
            TransactionTypeBadge(type = transaction.type)
            Text(
                text = formatCurrency(transaction.amount),
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = if (transaction.type == "INCOME") Color(0xFF059669) else Color(0xFFDC2626)
            )
        }

        Spacer(Modifier.height(16.dp))

        // Details card
        Card(
            modifier = Modifier.fillMaxWidth(),
            elevation = CardDefaults.cardElevation(4.dp),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                DetailRow(label = "Deskripsi", value = transaction.description)
                HorizontalDivider(Modifier.padding(vertical = 8.dp))
                DetailRow(label = "Status", value = getStatusLabel(transaction.status))
                HorizontalDivider(Modifier.padding(vertical = 8.dp))
                val typeLabel = if (transaction.type == "INCOME") "Pemasukan" else if (transaction.type == "EXPENSE") "Pengeluaran" else (transaction.type ?: "-")
                DetailRow(label = "Tipe", value = typeLabel)
                HorizontalDivider(Modifier.padding(vertical = 8.dp))
                val unitName = transaction.unit?.name
                DetailRow(label = "Unit", value = unitName ?: transaction.unitId)
                HorizontalDivider(Modifier.padding(vertical = 8.dp))
                val createdByName = transaction.createdBy?.name
                DetailRow(label = "Dibuat oleh", value = createdByName ?: transaction.createdById)
                HorizontalDivider(Modifier.padding(vertical = 8.dp))
                DetailRow(label = "Dibuat pada", value = formatDateFull(transaction.createdAt))
                if (transaction.reference != null) {
                    HorizontalDivider(Modifier.padding(vertical = 8.dp))
                    DetailRow(label = "Referensi", value = transaction.reference)
                }
                val accountName = transaction.account?.name
                if (accountName != null) {
                    HorizontalDivider(Modifier.padding(vertical = 8.dp))
                    val accountCode = transaction.account?.code
                    DetailRow(label = "Akun", value = "$accountName ($accountCode)")
                }
                val approverName = transaction.approvedBy?.name
                if (approverName != null) {
                    HorizontalDivider(Modifier.padding(vertical = 8.dp))
                    DetailRow(label = "Disetujui oleh", value = approverName)
                    HorizontalDivider(Modifier.padding(vertical = 8.dp))
                    val approvedAt = transaction.approvedAt
                    DetailRow(label = "Tanggal persetujuan", value = approvedAt?.let { formatDateFull(it) } ?: "-")
                }
            }
        }

        Spacer(Modifier.height(24.dp))

        val canApprove = role in listOf("SUPERADMIN", "PIMPINAN", "MANAGER") && transaction.status == "PENDING"
        if (canApprove) {
            var showApproveDialog by rememberSaveable { mutableStateOf(false) }
            var showRejectDialog by rememberSaveable { mutableStateOf(false) }
            val approvalViewModel: ApprovalViewModel = viewModel()
            var approveComment by rememberSaveable { mutableStateOf("") }
            var rejectComment by rememberSaveable { mutableStateOf("") }

            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Button(
                    onClick = { showApproveDialog = true },
                    modifier = Modifier.weight(1f),
                    colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = Color(0xFF059669))
                ) {
                    Text("Setujui")
                }
                Button(
                    onClick = { showRejectDialog = true },
                    modifier = Modifier.weight(1f),
                    colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626))
                ) {
                    Text("Tolak")
                }
            }

            if (showApproveDialog) {
                AlertDialog(
                    onDismissRequest = { showApproveDialog = false },
                    title = { Text("Setujui Transaksi") },
                    text = {
                        OutlinedTextField(
                            value = approveComment,
                            onValueChange = { approveComment = it },
                            label = { Text("Catatan (opsional)") },
                            singleLine = true
                        )
                    },
                    confirmButton = {
                        TextButton(onClick = {
                            approvalViewModel.approve(transaction.id, approveComment.takeIf { it.isNotBlank() })
                            showApproveDialog = false
                            approveComment = ""
                        }) {
                            Text("Setujui")
                        }
                    },
                    dismissButton = {
                        TextButton(onClick = { showApproveDialog = false }) {
                            Text("Batal")
                        }
                    }
                )
            }

            if (showRejectDialog) {
                AlertDialog(
                    onDismissRequest = { showRejectDialog = false },
                    title = { Text("Tolak Transaksi") },
                    text = {
                        OutlinedTextField(
                            value = rejectComment,
                            onValueChange = { rejectComment = it },
                            label = { Text("Catatan (opsional)") },
                            singleLine = true
                        )
                    },
                    confirmButton = {
                        TextButton(onClick = {
                            approvalViewModel.reject(transaction.id, rejectComment.takeIf { it.isNotBlank() })
                            showRejectDialog = false
                            rejectComment = ""
                        }) {
                            Text("Tolak")
                        }
                    },
                    dismissButton = {
                        TextButton(onClick = { showRejectDialog = false }) {
                            Text("Batal")
                        }
                    }
                )
            }
        }
    }
}

@Composable
fun DetailRow(label: String, value: String) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(text = label, style = MaterialTheme.typography.bodySmall, color = Color.Gray)
        Text(text = value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
    }
}

fun getStatusLabel(status: String): String = when (status.uppercase()) {
    "PENDING" -> "Menunggu Persetujuan"
    "APPROVED" -> "Disetujui"
    "REJECTED" -> "Ditolak"
    "DRAFT" -> "Draft"
    else -> status
}
