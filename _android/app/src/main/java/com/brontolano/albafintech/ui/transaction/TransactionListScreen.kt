package com.brontolano.albafintech.ui.transaction

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.brontolano.albafintech.data.model.Transaction
import com.brontolano.albafintech.data.model.TransactionStatus
import com.brontolano.albafintech.data.model.TransactionType
import com.brontolano.albafintech.ui.navigation.TransactionState
import com.brontolano.albafintech.ui.navigation.TransactionViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TransactionListScreen(
    viewModel: TransactionViewModel,
    onNavigateBack: () -> Unit,
    onNavigateToDetail: (Long) -> Unit,
    onNavigateToCreate: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.loadTransactions()
    }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text("Daftar Transaksi") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.refresh() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = onNavigateToCreate) {
                Icon(Icons.Default.Add, contentDescription = "Add Transaction")
            }
        }
    ) { padding ->
        TransactionListContent(
            uiState = uiState,
            onItemClick = onNavigateToDetail,
            onLoadMore = { viewModel.loadMore() },
            modifier = Modifier.padding(padding)
        )
    }
}

@Composable
fun TransactionListContent(
    uiState: TransactionState,
    onItemClick: (Long) -> Unit,
    onLoadMore: () -> Unit,
    modifier: Modifier = Modifier
) {
    val listState = rememberLazyListState()

    // Collect scroll position to trigger loading more
    val shouldLoadMore = uiState.hasNextPage && !uiState.isLoadingMore && uiState.transactions.isNotEmpty()

    LaunchedEffect(listState, shouldLoadMore) {
        snapshotFlow { 
            val lastItemIndex = uiState.transactions.size - 1
            val lastVisibleIndex = listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0
            lastVisibleIndex to lastItemIndex 
        }.collect { (lastVisible, lastItem) ->
            if (lastVisible >= lastItem && shouldLoadMore) {
                onLoadMore()
            }
        }
    }

    Box(modifier = modifier.fillMaxSize()) {
        when {
            uiState.isLoading -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
            uiState.transactions.isEmpty() -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Text(text = "No transactions found")
                }
            }
            else -> {
                LazyColumn(
                    state = listState,
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(uiState.transactions, key = { it.id }) { transaction ->
                        TransactionListItem(
                            transaction = transaction,
                            onClick = { onItemClick(transaction.id) }
                        )
                    }

                    if (uiState.hasNextPage) {
                        item {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                if (uiState.isLoadingMore) {
                                    CircularProgressIndicator()
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TransactionListItem(
    transaction: Transaction,
    onClick: () -> Unit
) {
    Card(
        onClick = onClick,
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLowest
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = transaction.description,
                style = MaterialTheme.typography.titleMedium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = "${transaction.unitName} • ${formatDate(transaction.date)}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "${if (transaction.type == TransactionType.INCOME) "+" else "-"} Rp${formatCurrency(transaction.amount)}",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = if (transaction.type == TransactionType.INCOME) {
                        MaterialTheme.colorScheme.tertiary
                    } else {
                        MaterialTheme.colorScheme.error
                    }
                )
                Text(
                    text = transaction.status.name,
                    style = MaterialTheme.typography.labelSmall
                )
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
fun TransactionListScreenPreview() {
    val sampleState = TransactionState(
        transactions = listOf(
            Transaction(
                id = 1,
                description = "Test Transaction",
                amount = 100000.0,
                type = TransactionType.EXPENSE,
                status = TransactionStatus.PENDING,
                unitId = 1,
                unitName = "HQ",
                date = "2024-01-01T00:00:00Z"
            )
        )
    )
    
    MaterialTheme {
        TransactionListContent(
            uiState = sampleState,
            onItemClick = {},
            onLoadMore = {}
        )
    }
}

private fun formatCurrency(amount: Double): String {
    return amount.toInt().toString()
}

private fun formatDate(dateString: String): String {
    return if (dateString.isBlank()) "" else dateString.split("T").firstOrNull() ?: dateString
}