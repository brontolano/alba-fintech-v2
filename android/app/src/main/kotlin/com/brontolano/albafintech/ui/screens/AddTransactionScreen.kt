package com.brontolano.albafintech.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.graphics.Color
import kotlinx.coroutines.launch
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import com.brontolano.albafintech.data.models.Account
import com.brontolano.albafintech.data.models.CreateTransactionRequest
import com.brontolano.albafintech.data.remote.ApiClient
import com.brontolano.albafintech.ui.viewmodel.AuthViewModel
import com.brontolano.albafintech.ui.viewmodel.TransactionViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddTransactionScreen(
    navController: NavHostController,
    authViewModel: AuthViewModel = viewModel(),
    transactionViewModel: TransactionViewModel = viewModel()
) {
    val authState by authViewModel.uiState.collectAsState()
    val createState by transactionViewModel.createState.collectAsState()
    val user = authState.user

    var selectedType by rememberSaveable { mutableStateOf("INCOME") }
    var amount by rememberSaveable { mutableStateOf("") }
    var description by rememberSaveable { mutableStateOf("") }
    var reference by rememberSaveable { mutableStateOf("") }
    var selectedAccount by rememberSaveable { mutableStateOf<String?>(null) }
    var accounts by remember { mutableStateOf<List<Account>>(emptyList()) }
    var accountsLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val context = androidx.compose.ui.platform.LocalContext.current
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    // Load accounts
    LaunchedEffect(Unit) {
        try {
            val api = ApiClient.getClient(context)
            val response = api.getAccounts()
            if (response.data != null) {
                accounts = response.data
                if (accounts.isNotEmpty()) {
                    selectedAccount = accounts.firstOrNull { it.type == selectedType }?.id
                        ?: accounts.first().id
                }
            }
            accountsLoading = false
        } catch (e: Exception) {
            accountsLoading = false
            errorMessage = e.message ?: "Gagal memuat akun"
        }
    }

    // Watch for success
    LaunchedEffect(createState.success) {
        if (createState.success) {
            snackbarHostState.showSnackbar("Transaksi berhasil dibuat")
            transactionViewModel.clearCreateState()
            navController.navigateUp()
        }
    }

    // Watch for API errors
    LaunchedEffect(createState.error) {
        createState.error?.let {
            snackbarHostState.showSnackbar(it)
        }
    }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text("Tambah Transaksi") },
                navigationIcon = {
                    IconButton(onClick = { navController.navigateUp() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                // Type selector
                var expanded by remember { mutableStateOf(false) }
                Box {
                    OutlinedButton(onClick = { expanded = true }) {
                        Text(selectedType)
                    }
                    DropdownMenu(
                        expanded = expanded,
                        onDismissRequest = { expanded = false }
                    ) {
                        DropdownMenuItem(text = { Text("INCOME") }, onClick = {
                            selectedType = "INCOME"
                            selectedAccount = accounts.firstOrNull { it.type == "INCOME" }?.id
                                ?: selectedAccount
                            expanded = false
                        })
                        DropdownMenuItem(text = { Text("EXPENSE") }, onClick = {
                            selectedType = "EXPENSE"
                            selectedAccount = accounts.firstOrNull { it.type == "EXPENSE" }?.id
                                ?: selectedAccount
                            expanded = false
                        })
                    }
                }

                Spacer(Modifier.height(12.dp))

                // Amount
                OutlinedTextField(
                    value = amount,
                    onValueChange = { newValue ->
                        if (newValue.all { c -> c.isDigit() || c == '.' }) {
                            amount = newValue
                        }
                    },
                    label = { Text("Jumlah (Rp)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                )

                Spacer(Modifier.height(12.dp))

                // Description
                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("Deskripsi") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(Modifier.height(12.dp))

                // Reference
                OutlinedTextField(
                    value = reference,
                    onValueChange = { reference = it },
                    label = { Text("Referensi (opsional)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(Modifier.height(12.dp))

                // Account selector
                if (accountsLoading) {
                    Text("Memuat akun...", style = MaterialTheme.typography.bodySmall)
                } else {
                    var accExpanded by remember { mutableStateOf(false) }
                    Box {
                        OutlinedButton(onClick = { accExpanded = true }) {
                            Text(selectedAccount?.let { id ->
                                accounts.find { it.id == id }?.let { "${it.name} (${it.code})" }
                            } ?: "Pilih Akun")
                        }
                        DropdownMenu(
                            expanded = accExpanded,
                            onDismissRequest = { accExpanded = false }
                        ) {
                            accounts.forEach { acc ->
                                DropdownMenuItem(
                                    text = { Text("${acc.name} (${acc.code})") },
                                    onClick = {
                                        selectedAccount = acc.id
                                        accExpanded = false
                                    }
                                )
                            }
                        }
                    }
                }

                Spacer(Modifier.height(16.dp))

                // Unit info (read-only — from user session)
                Text(
                    "Unit: ${user?.unitId ?: "(belum ditetapkan)"}",
                    style = MaterialTheme.typography.bodyMedium
                )

                Spacer(Modifier.height(24.dp))

                Button(
                    onClick = {
                        val unitId = user?.unitId
                        if (unitId.isNullOrEmpty()) {
                            scope.launch { snackbarHostState.showSnackbar("Unit tidak tersedia") }
                            return@Button
                        }
                        val amt = amount.toDoubleOrNull()
                        if (amt == null || amt <= 0) {
                            scope.launch { snackbarHostState.showSnackbar("Jumlah harus lebih dari 0") }
                            return@Button
                        }
                        if (description.isBlank()) {
                            scope.launch { snackbarHostState.showSnackbar("Deskripsi wajib diisi") }
                            return@Button
                        }

                        transactionViewModel.createTransaction(
                            CreateTransactionRequest(
                                unitId = unitId,
                                type = selectedType,
                                amount = amt,
                                description = description.trim(),
                                reference = if (reference.isNotBlank()) reference.trim() else null,
                                accountId = selectedAccount
                            )
                        )
                    },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !createState.isLoading
                ) {
                    if (createState.isLoading) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp))
                    } else {
                        Text("Simpan")
                    }
                }

                if (errorMessage != null) {
                    Spacer(Modifier.height(8.dp))
                    Text(
                        errorMessage!!,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        }
    }
}
