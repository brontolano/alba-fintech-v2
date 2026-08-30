package com.brontolano.albafintech.ui.transaction

import androidx.compose.material3.ExperimentalMaterial3Api

import androidx.compose.foundation.background
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.brontolano.albafintech.data.model.Transaction
import com.brontolano.albafintech.data.model.TransactionStatus
import com.brontolano.albafintech.data.model.TransactionType
import com.brontolano.albafintech.ui.navigation.LocalSnackbarHostState
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TransactionDetailScreen(
    transactionId: Long,
    viewModel: TransactionViewModel,
    onNavigateBack: () -> Unit,
    onEditTransaction: (Long) -> Unit
) {
    val detailState by viewModel.detailUiState.collectAsState()
    val snackbarHostState = LocalSnackbarHostState.current

    LaunchedEffect(transactionId) {
        viewModel.loadTransactionDetail(transactionId)
    }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text("Detail Transaksi") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.Rounded.Close,
                            contentDescription = "Back"
                        )
                    }
                },
                actions = {
                    detailState.let { state ->
                        if (state is DetailUiState.Success) {
                            val tx = state.transaction
                            if (tx.status != TransactionStatus.APPROVED) {
                                IconButton(onClick = { onEditTransaction(tx.id) }) {
                                    Icon(
                                        imageVector = Icons.Rounded.Edit,
                                        contentDescription = "Edit"
                                    )
                                }
                            }
                        }
                    }
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surfaceContainerLowest,
                    titleContentColor = MaterialTheme.colorScheme.onSurface
                )
            )
        },
        snackbarHost = { SnackbarHost(hostState = snackbarHostState) }
    ) { padding ->
        TransactionDetailContent(
            detailState = detailState,
            onDeleteRequest = {
                viewModel.deleteTransaction(transactionId)
            },
            modifier = Modifier.padding(padding)
        )
    }
}

@Composable
fun TransactionDetailContent(
    detailState: DetailUiState,
    onDeleteRequest: () -> Unit,
    modifier: Modifier = Modifier
) {
    var showDeleteDialog by rememberSaveable { mutableStateOf(false) }

    Box(modifier = modifier.fillMaxSize()) {
        when (detailState) {
            is DetailUiState.Loading -> {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center),
                    strokeWidth = 4.dp,
                    color = MaterialTheme.colorScheme.primary,
                    strokeCap = StrokeCap.Round
                )
            }
            is DetailUiState.Error -> {
                Text(
                    text = detailState.message,
                    color = MaterialTheme.colorScheme.error,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.align(Alignment.Center)
                )
            }
            is DetailUiState.Success -> {
                val tx = detailState.transaction
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp)
                ) {
                    // Transaction number + status
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = tx.transactionNumber,
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold
                        )
                        StatusChip(status = tx.status)
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Amount
                    Text(
                        text = formatCurrency(tx.amount),
                        style = MaterialTheme.typography.displaySmall,
                        fontWeight = FontWeight.Bold,
                        color = if (tx.type == TransactionType.INCOME) {
                            MaterialTheme.colorScheme.tertiary
                        } else {
                            MaterialTheme.colorScheme.error
                        }
                    )

                    Text(
                        text = if (tx.type == TransactionType.INCOME) "Pemasukan" else "Pengeluaran",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    // Description
                    Text(
                        text = "Keterangan",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = tx.description,
                        style = MaterialTheme.typography.bodyLarge
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    // Unit
                    DetailInfoRow(label = "Unit", value = tx.unitName)
                    DetailInfoRow(label = "Metode", value = tx.method)
                    DetailInfoRow(label = "Kategori", value = tx.category)
                    DetailInfoRow(label = "Dibuat oleh", value = tx.createdBy)
                    DetailInfoRow(label = "Tanggal dibuat", value = formatDate(tx.createdAt))
                    DetailInfoRow(label = "Diperbarui", value = formatDate(tx.updatedAt))
                    tx.approverName?.let {
                        DetailInfoRow(label = "Disetujui oleh", value = it)
                    }
                    tx.approvedAt?.let {
                        DetailInfoRow(label = "Tanggal persetujuan", value = formatDate(it))
                    }

                    // Photo
                    tx.photoUrl?.let { url ->
                        if (url.isNotBlank()) {
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                text = "Foto Bukti",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            AsyncImage(
                                model = url,
                                contentDescription = "Transaction photo",
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(200.dp)
                                    .clip(RoundedCornerShape(12.dp)),
                                contentScale = ContentScale.Crop,
                                placeholder = null,
                                error = null
                            )
                        }
                    }

                    // Location
                    if (tx.latitude != null && tx.longitude != null) {
                        Spacer(modifier = Modifier.height(16.dp))
                        DetailInfoRow(
                            label = "Lokasi",
                            value = "${tx.latitude}, ${tx.longitude}"
                        )
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    // Delete button
                    FilledTonalButton(
                        onClick = { showDeleteDialog = true },
                        modifier = Modifier.fillMaxWidth(),
                        colors = androidx.compose.material3.ButtonDefaults.filledTonalButtonColors(
                            containerColor = MaterialTheme.colorScheme.errorContainer,
                            contentColor = MaterialTheme.colorScheme.onErrorContainer
                        )
                    ) {
                        Text("Hapus Transaksi")
                    }
                }

                if (showDeleteDialog) {
                    AlertDialog(
                        onDismissRequest = { showDeleteDialog = false },
                        title = { Text("Hapus Transaksi?") },
                        text = { Text("Tindakan ini tidak dapat dibatalkan. Transaksi akan dihapus secara permanen.") },
                        confirmButton = {
                            TextButton(onClick = {
                                onDeleteRequest()
                                showDeleteDialog = false
                            }) {
                                Text("Hapus", color = MaterialTheme.colorScheme.error)
                            }
                        },
                        dismissButton = {
                            TextButton(onClick = { showDeleteDialog = false }) {
                                Text("Batal")
                            }
                        }
                    )
                }
            }
        }
    }
}

@Composable
fun DetailInfoRow(label: String, value: String) {
    Column(modifier = Modifier.padding(vertical = 4.dp)) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = value.ifEmpty { "-" },
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium
        )
    }
}

private fun formatCurrency(amount: Double): String {
    val formatter = NumberFormat.getCurrencyInstance(Locale("id", "ID"))
    formatter.minimumFractionDigits = 0
    formatter.maximumFractionDigits = 0
    return formatter.format(amount)
}

private fun formatDate(dateString: String): String {
    if (dateString.isBlank()) return "-"
    return try {
        val parts = dateString.split("T")
        if (parts.isNotEmpty()) {
            val dateParts = parts[0].split("-")
            val timePart = if (parts.size > 1) parts[1].take(5) else ""
            if (dateParts.size == 3) {
                "${dateParts[2]}/${dateParts[1]}/${dateParts[0]} ${if (timePart.isNotBlank()) timePart else ""}".trim()
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