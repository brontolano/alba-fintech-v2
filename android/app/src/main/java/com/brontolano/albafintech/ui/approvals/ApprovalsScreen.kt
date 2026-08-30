@file:Suppress("UnusedMaterial3ScaffoldPaddingParameter")

package com.brontolano.albafintech.ui.approvals

import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.AutoMirrored.Rounded.ArrowBack
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material3.Badge
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.brontolano.albafintech.data.model.Transaction
import com.brontolano.albafintech.data.model.TransactionStatus
import com.brontolano.albafintech.data.model.TransactionType
import com.brontolano.albafintech.data.model.TransactionSummary
import com.brontolano.albafintech.ui.components.BottomNavHeight
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
    val listState = rememberLazyListState()

    LaunchedEffect(Unit) {
        viewModel.loadApprovals(reset = true)
    }

    // Surface any error to the user via the shared snackbar host.
    LaunchedEffect(uiState.error) {
        uiState.error?.let { msg -> snackbarHostState.showSnackbar(msg) }
    }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text("Persetujuan Transaksi") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = ArrowBack,
                            contentDescription = "Kembali",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surfaceContainerLowest,
                    titleContentColor = MaterialTheme.colorScheme.onSurface,
                    navigationIconContentColor = MaterialTheme.colorScheme.onSurfaceVariant
                )
            )
        },
        snackbarHost = { SnackbarHost(hostState = snackbarHostState) }
    ) { innerPadding ->
        if (uiState.isLoading && uiState.transactions.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(
                    strokeWidth = 4.dp,
                    color = MaterialTheme.colorScheme.primary,
                    strokeCap = StrokeCap.Round
                )
            }
        } else if (uiState.error != null && uiState.transactions.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = uiState.error ?: "Gagal memuat data",
                    color = MaterialTheme.colorScheme.error,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(32.dp)
                )
            }
        } else if (uiState.transactions.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "Tidak ada transaksi yang menunggu persetujuan",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(32.dp)
                )
            }
        } else {
            LazyColumn(
                state = listState,
                contentPadding = PaddingValues(
                    vertical = 16.dp,
                    horizontal = 16.dp,
                    // Lift the last items above the bottom bar.
                    bottom = 16.dp + BottomNavHeight
                ),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(uiState.transactions, key = { it.id }) { transaction ->
                    ApprovalItem(
                        transaction = transaction,
                        onClick = { onNavigateToDetail(transaction.id) }
                    )
                }

                if (uiState.hasNextPage && !uiState.isLoadingMore) {
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressIndicator(
                                color = MaterialTheme.colorScheme.primary,
                                strokeWidth = 2.dp
                            )
                        }
                    }
                }
            }

            // Infinite scroll: trigger the next page when the last item is shown.
            val shouldLoadMore = !uiState.isLoading &&
                !uiState.isLoadingMore &&
                uiState.hasNextPage &&
                listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ==
                uiState.transactions.lastIndex
            LaunchedEffect(shouldLoadMore) {
                if (shouldLoadMore) viewModel.loadMore()
            }
        }
    }
}

@Composable
fun ApprovalItem(
    transaction: TransactionSummary,
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
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            MaterialTheme.colorScheme.outline
        )
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
                    color = if (isIncome) {
                        MaterialTheme.colorScheme.tertiary
                    } else {
                        MaterialTheme.colorScheme.error
                    }
                )
                StatusChip(status = transaction.status)
            }
        }
    }
}

@Composable
fun StatusChip(status: TransactionStatus) {
    val (text, bgColor, fgColor) = when (status) {
        TransactionStatus.APPROVED ->
            Triple("Disetujui", MaterialTheme.colorScheme.tertiaryContainer, MaterialTheme.colorScheme.onTertiary)
        TransactionStatus.PENDING ->
            Triple("Pending", MaterialTheme.colorScheme.secondaryContainer, MaterialTheme.colorScheme.onSecondaryContainer)
        TransactionStatus.REJECTED ->
            Triple("Ditolak", MaterialTheme.colorScheme.errorContainer, MaterialTheme.colorScheme.onErrorContainer)
        TransactionStatus.DRAFT ->
            Triple("Draft", MaterialTheme.colorScheme.surfaceContainerHigh, MaterialTheme.colorScheme.onSurfaceVariant)
    }
    Badge(
        containerColor = bgColor,
        contentColor = fgColor,
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

@Composable
@androidx.compose.ui.tooling.preview.Preview(
    showBackground = true,
    device = "spec:parent=mobile,shape=Normal,width=412,height=892,unit=dp,device=pixel_5"
)
fun ApprovalsScreenPreview() {
    com.brontolano.albafintech.ui.theme.AlbaFintechTheme {
        androidx.compose.material3.Surface {
            ApprovalsScreen(
                viewModel = ApprovalsViewModel(),
                onNavigateBack = {},
                onNavigateToDetail = {}
            )
        }
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
            if (dateParts.size == 3) {
                val timePart = if (parts.size > 1) parts[1].take(5) else ""
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

@Suppress("unused")
private fun formatCurrencyFromTransaction(tx: Transaction): String {
    val formatter = NumberFormat.getCurrencyInstance(Locale("id", "ID"))
    formatter.minimumFractionDigits = 0
    formatter.maximumFractionDigits = 0
    return formatter.format(tx.amount)
}

@Suppress("unused")
private fun avatarContentScale(): ContentScale = ContentScale.Crop
