package com.brontolano.albafintech.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.brontolano.albafintech.AlbaFintechApp
import com.brontolano.albafintech.data.models.Transaction
import com.brontolano.albafintech.data.remote.ApiClient
import kotlinx.coroutines.launch

@Composable
fun TransactionListScreen() {
    val context = LocalContext.current
    val session = (context.applicationContext as AlbaFintechApp).getSessionManager()
    val token = session.getAccessToken() ?: ""
    val scope = rememberCoroutineScope()
    var txList by remember { mutableStateOf<List<Transaction>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        scope.launch {
            try {
                val api = ApiClient.getClient(context)
                txList = api.getTransactions("Bearer $token")
            } catch (_: Exception) { txList = emptyList() }
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
        items(txList) { tx ->
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
