package com.brontolano.albafintech.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import com.brontolano.albafintech.data.models.Approval
import com.brontolano.albafintech.ui.viewmodel.ApprovalActionUiState
import com.brontolano.albafintech.ui.viewmodel.ApprovalViewModel
import androidx.compose.runtime.saveable.rememberSaveable


@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ApprovalListScreen(
    navController: NavHostController,
    approvalViewModel: ApprovalViewModel = viewModel()
) {
    val state by approvalViewModel.uiState.collectAsState()
    val actionState by approvalViewModel.actionState.collectAsState()
    var showDialog by remember { mutableStateOf(false) }
    var selectedApproval by remember { mutableStateOf<Approval?>(null) }
    var selectedAction by remember { mutableStateOf("approve") }

    // Show snackbar on action result
    val snackbarHostState = remember { SnackbarHostState() }
    LaunchedEffect(actionState) {
        when (actionState) {
            is ApprovalActionUiState.Success -> {
                snackbarHostState.showSnackbar("Transaksi berhasil diproses")
                approvalViewModel.clearActionState()
                kotlinx.coroutines.delay(300)
                approvalViewModel.loadApprovals()
            }
            is ApprovalActionUiState.Error -> {
                snackbarHostState.showSnackbar((actionState as ApprovalActionUiState.Error).message)
                approvalViewModel.clearActionState()
            }
            else -> {}
        }
    }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(title = { Text("Persetujuan") })
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            when {
                state.isLoading -> {
                    CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                }
                state.error != null -> {
                    Text(
                        state.error!!,
                        modifier = Modifier.align(Alignment.Center),
                        color = MaterialTheme.colorScheme.error
                    )
                }
                state.approvals.isEmpty() -> {
                    Text(
                        "Tidak ada permintaan persetujuan",
                        modifier = Modifier.align(Alignment.Center)
                    )
                }
                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(8.dp)
                    ) {
                        items(state.approvals, key = { it.id }) { approval ->
                            ApprovalCard(
                                approval = approval,
                                onApproveClick = {
                                    selectedApproval = approval
                                    selectedAction = "approve"
                                    showDialog = true
                                },
                                onRejectClick = {
                                    selectedApproval = approval
                                    selectedAction = "reject"
                                    showDialog = true
                                }
                            )
                        }
                    }
                }
            }
        }
    }

    // Approval confirmation dialog
    if (showDialog && selectedApproval != null) {
        val approval = selectedApproval!!
        var comment by rememberSaveable { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { showDialog = false },
            title = {
                Text(if (selectedAction == "approve") "Setujui Transaksi?" else "Tolak Transaksi?")
            },
            text = {
                Column {
                    Text("Deskripsi: ${approval.transaction?.description ?: "-"}")
                    Spacer(Modifier.height(8.dp))
                    Text("Jumlah: ${formatCurrency(approval.transaction?.amount ?: 0.0)}")
                    Spacer(Modifier.height(8.dp))
                    Text("Masukkan komentar (opsional):")
                    OutlinedTextField(
                        value = comment,
                        onValueChange = { comment = it },
                        label = { Text("Komentar") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        val commentValue = if (comment.isBlank()) null else comment
                        approvalViewModel.approveTransaction(
                            approval.transactionId,
                            selectedAction,
                            commentValue
                        )
                        showDialog = false
                        selectedApproval = null
                        comment = ""
                    }
                ) {
                    Text(if (selectedAction == "approve") "Setujui" else "Tolak")
                }
            },
            dismissButton = {
                TextButton(onClick = { showDialog = false }) {
                    Text("Batal")
                }
            }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ApprovalCard(
    approval: Approval,
    onApproveClick: () -> Unit,
    onRejectClick: () -> Unit
) {
    val tx = approval.transaction
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    tx?.description ?: "Transaksi",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                StatusBadge(status = tx?.status ?: "PENDING")
            }

            Spacer(Modifier.height(4.dp))

            tx?.let { t ->
                Text(
                    formatCurrency(t.amount),
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Bold,
                    color = if (t.type == "INCOME") Color(0xFF059669) else Color(0xFFDC2626)
                )
            }

            Spacer(Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    formatDateShort(approval.createdAt),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                if (approval.status == "PENDING") {
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        TextButton(onClick = onApproveClick) {
                            Text("Setujui", color = Color(0xFF059669))
                        }
                        TextButton(onClick = onRejectClick) {
                            Text("Tolak", color = Color(0xFFDC2626))
                        }
                    }
                } else {
                    StatusBadge(status = approval.status)
                }
            }

            approval.comment?.let { comment ->
                if (comment.isNotBlank()) {
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "Komentar: $comment",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}
