package com.brontolano.albafintech.ui.approvals

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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.CircularProgressIndicator
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
fun ApprovalsScreen(
    viewModel: ApprovalsViewModel,
    onNavigateBack: () -> Unit,
    onNavigateToDetail: (Long) -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = LocalSnackbarHostState.current

    LaunchedEffect(Unit) {
        viewModel.loadApprovals(reset = true)
    }

    // Show error snackbar
    LaunchedEffect(uiState.error) {
        uiState.error?.let { msg ->
            snackbarHostState.showSnackbar(msg)
        }
    }

    Scaffold(
        topBar = {
            androidx.compose.material3.CenterAlignedTopAppBar(
                title = { androidx.compose.material3.Text("Persetujuan Transaksi") },
                navigationIcon = {
                    androidx.compose.material3.IconButton(onClick = onNavigateBack) {
                        androidx.compose.material.icons.rounded.Close(
                            contentDescription = "Back",
                            modifier = androidx.compose.ui.Modifier.size(24.dp)
                        )
                    }
                },
                colors = androidx.compose.material3.TopAppBarDefaults.centerAlignedTopAppBarColors(
                    containerColor = androidx.compose.material3.MaterialTheme.colorScheme.surfaceContainerLowest,
                    titleContentColor = androidx.compose.material3.MaterialTheme.colorScheme.onSurface
                )
            )
        },
        snackbarHost = { SnackbarHost(hostState = snackbarHostState) }
    ) { padding ->
        ApprovalsContent(
            uiState = viewModel.uiState.collectAsState().value,
            onItemClick = onNavigateToDetail,
            onLoadMore = { viewModel.loadMore() },
            onApproveClick = { id -> /* TODO: approve */ },
            onRejectClick = { id -> /* TODO: reject */ },
            modifier = androidx.compose.ui.Modifier.padding(padding)
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ApprovalsContent(
    uiState: com.brontolano.albafintech.ui.approvals.ApprovalsUiState,
    onItemClick: (Long) -> Unit,
    onLoadMore: () -> Unit,
    onApproveClick: (Long) -> Unit,
    onRejectClick: (Long) -> Unit,
    modifier: androidx.compose.ui.Modifier = androidx.compose.ui.Modifier
) {
    val listState = androidx.compose.foundation.lazy.rememberLazyListState()

    androidx.compose.foundation.layout.Box(modifier = modifier.fillMaxSize()) {
        when {
            uiState.isLoading && uiState.transactions.isEmpty() -> {
                androidx.compose.material3.CircularProgressIndicator(
                    modifier = androidx.compose.ui.Modifier.align(androidx.compose.ui.Alignment.Center),
                    strokeWidth = 4.dp,
                    color = androidx.compose.material3.MaterialTheme.colorScheme.primary,
                    strokeCap = androidx.compose.ui.graphics.StrokeCap.Round
                )
            }
            uiState.error != null && uiState.transactions.isEmpty() -> {
                androidx.compose.material3.Text(
                    text = uiState.error ?: "Error loading approvals",
                    color = androidx.compose.material3.MaterialTheme.colorScheme.error,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    modifier = androidx.compose.ui.Modifier.align(androidx.compose.ui.Alignment.Center)
                )
            }
            else -> {
                if (uiState.transactions.isEmpty()) {
                    androidx.compose.material3.Text(
                        text = "Tidak ada transaksi yang menunggu persetujuan",
                        color = androidx.compose.material3.MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                        modifier = androidx.compose.ui.Modifier
                            .fillMaxWidth()
                            .align(androidx.compose.ui.Alignment.Center)
                            .padding(32.dp)
                    )
                } else {
                    androidx.compose.foundation.lazy.LazyColumn(
                        state = androidx.compose.foundation.lazy.rememberLazyListState(),
                        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
                        verticalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(8.dp)
                    ) {
                        items(uiState.transactions, key = { it.id }) { transaction ->
                            ApprovalTransactionItem(
                                transaction = transaction,
                                onClick = { /* TODO: navigate to detail */ }
                            )
                        }

                        item {
                            if (uiState.hasNextPage && !uiState.isLoading && uiState.transactions.isNotEmpty()) {
                                Box(
                                    modifier = androidx.compose.ui.Modifier
                                        .fillMaxWidth()
                                        .padding(16.dp),
                                    contentAlignment = androidx.compose.ui.Alignment.Center
                                ) {
                                    androidx.compose.material3.CircularProgressIndicator(
                                        color = androidx.compose.material3.MaterialTheme.colorScheme.primary,
                                        strokeWidth = 2.dp
                                    )
                                }
                            }
                        }
                    }

                    // Infinite scroll
                    val shouldLoadMore = !uiState.isLoading &&
                        !uiState.isLoadingMore &&
                        uiState.hasNextPage &&
                        listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index == uiState.transactions.lastIndex
                    if (shouldLoadMore) {
                        androidx.compose.runtime.LaunchedEffect(Unit) {
                            // viewModel.loadMore()
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ApprovalTransactionItem(
    transaction: com.brontolano.albafintech.data.model.TransactionSummary,
    onClick: () -> Unit
) {
    androidx.compose.material3.Card(
        modifier = androidx.compose.ui.Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = androidx.compose.foundation.shape.RoundedCornerShape(16.dp),
        colors = androidx.compose.material3.CardDefaults.cardColors(
            containerColor = androidx.compose.material3.MaterialTheme.colorScheme.surfaceContainerLowest
        ),
        border = androidx.compose.foundation.BorderStroke(1.dp, androidx.compose.material3.MaterialTheme.colorScheme.outline)
    ) {
        androidx.compose.foundation.layout.Row(
            modifier = androidx.compose.ui.Modifier
                .fillMaxWidth()
                .clickable(onClick = onClick),
            verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
            horizontalArrangement = androidx.compose.foundation.layout.Arrangement.SpaceBetween
        ) {
            androidx.compose.foundation.layout.Column(modifier = androidx.compose.ui.Modifier.weight(1f)) {
                androidx.compose.material3.Text(
                    text = transaction.description,
                    style = androidx.compose.material3.MaterialTheme.typography.bodyMedium,
                    fontWeight = androidx.compose.ui.text.font.FontWeight.Medium,
                    maxLines = 1,
                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                )
                androidx.compose.material3.Text(
                    text = "${transaction.unitName} • ${formatDate(transaction.date)}",
                    style = androidx.compose.material3.MaterialTheme.typography.bodySmall,
                    color = androidx.compose.material3.MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            androidx.compose.foundation.layout.Column(horizontalAlignment = androidx.compose.ui.Alignment.End) {
                val isIncome = transaction.type == com.brontolano.albafintech.data.model.TransactionType.INCOME
                androidx.compose.material3.Text(
                    text = "${if (isIncome) "+" else "-"} ${formatCurrency(transaction.amount)}",
                    style = androidx.compose.material3.MaterialTheme.typography.bodySmall,
                    fontWeight = androidx.compose.ui.text.font.FontWeight.Bold,
                    color = if (isIncome) androidx.compose.material3.MaterialTheme.colorScheme.tertiary else androidx.compose.material3.MaterialTheme.colorScheme.error
                )
                StatusChip(status = transaction.status)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StatusChip(status: TransactionStatus) {
    val (text, color, backgroundColor) = when (status) {
        TransactionStatus.APPROVED -> Triple("Disetujui", androidx.compose.material3.MaterialTheme.colorScheme.onTertiary, androidx.compose.material3.MaterialTheme.colorScheme.tertiaryContainer)
        TransactionStatus.PENDING -> Triple("Pending", androidx.compose.material3.MaterialTheme.colorScheme.onSecondaryContainer, androidx.compose.material3.MaterialTheme.colorScheme.secondaryContainer)
        TransactionStatus.REJECTED -> Triple("Ditolak", androidx.compose.material3.MaterialTheme.colorScheme.onErrorContainer, androidx.compose.material3.MaterialTheme.colorScheme.errorContainer)
        TransactionStatus.DRAFT -> Triple("Draft", androidx.compose.material3.MaterialTheme.colorScheme.onSurfaceVariant, androidx.compose.material3.MaterialTheme.colorScheme.surfaceContainerHigh)
    }
    androidx.compose.material3.Badge(
        containerColor = backgroundColor,
        contentColor = color,
        modifier = androidx.compose.ui.Modifier
            .height(20.dp)
            .padding(start = 4.dp)
    ) {
        androidx.compose.material3.Text(
            text = text,
            style = androidx.compose.material3.MaterialTheme.typography.bodySmall,
            fontSize = 10.sp,
            fontWeight = androidx.compose.ui.text.font.FontWeight.Bold
        )
    }
}

@Composable
@Preview(showBackground = true)
fun ApprovalsScreenPreview() {
    com.brontolano.albafintech.ui.theme.AlbaFintechTheme {
        androidx.compose.material3.Surface {
            ApprovalsScreen(
                viewModel = com.brontolano.albafintech.ui.approvals.ApprovalsViewModel(),
                onNavigateBack = {},
                onNavigateToDetail = {}
            )
        }
    }
}

private fun formatCurrency(amount: Double): String {
    val formatter = java.text.NumberFormat.getCurrencyInstance(java.util.Locale("id", "ID"))
    formatter.minimumFractionDigits = 0
    formatter.maximumFractionDigits = 0
    return formatter.format(amount)
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