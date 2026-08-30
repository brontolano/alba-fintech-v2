package com.brontolano.albafintech.ui.transaction

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.filled.ArrowDownward
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.rounded.PhotoCamera
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.Scaffold
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.foundation.border
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight

import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.FileProvider
import coil.compose.AsyncImage
import com.brontolano.albafintech.data.model.TransactionRequest
import com.brontolano.albafintech.data.model.TransactionType
import com.brontolano.albafintech.ui.navigation.LocalSnackbarHostState
import java.io.File
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditTransactionScreen(
    id: Long,
    viewModel: TransactionViewModel,
    onNavigateBack: () -> Unit,
    onTransactionUpdated: () -> Unit
) {
    val snackbarHostState = LocalSnackbarHostState.current
    val detailState by viewModel.detailUiState.collectAsState()
    val context = LocalContext.current

    LaunchedEffect(id) {
        viewModel.loadTransactionDetail(id)
    }

    // Consume one-shot navigation / messaging events from the ViewModel so the
    // edit flow only returns to the previous screen on success; errors surface
    // as a snackbar and keep the user on the form.
    val event by viewModel.eventFlow.collectAsState()
    LaunchedEffect(event) {
        when (event) {
            is TransactionEvent.NavigateBack -> {
                onTransactionUpdated()
                viewModel.clearEvent()
            }
            is TransactionEvent.ShowMessage -> {
                snackbarHostState.showSnackbar(
                    (event as TransactionEvent.ShowMessage).message
                )
                viewModel.clearEvent()
            }
            else -> {}
        }
    }

    var description by rememberSaveable { mutableStateOf("") }
    var amount by rememberSaveable { mutableStateOf("") }
    var selectedType by rememberSaveable { mutableStateOf(TransactionType.EXPENSE) }
    var selectedMethod by rememberSaveable { mutableStateOf("Tunai") }
    var category by rememberSaveable { mutableStateOf("") }
    var selectedUnitId by rememberSaveable { mutableStateOf<Long?>(null) }
    var photoUri by rememberSaveable { mutableStateOf<Uri?>(null) }
    var isSaving by rememberSaveable { mutableStateOf(false) }

    val cameraLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicture()
    ) { success ->
        if (success) { /* Photo captured */ }
    }

    LaunchedEffect(detailState) {
        if (detailState is DetailUiState.Success) {
            val tx = (detailState as DetailUiState.Success).transaction
            description = tx.description
            amount = formatCurrencyPlain(tx.amount)
            selectedType = tx.type
            selectedMethod = tx.method
            category = tx.category
            selectedUnitId = tx.unitId
            photoUri = tx.photoUrl?.let { Uri.parse(it) }
        }
    }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text("Edit Transaksi") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.Rounded.Close,
                            contentDescription = "Back"
                        )
                    }
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surfaceContainerLowest,
                    titleContentColor = MaterialTheme.colorScheme.onSurface
                )
            )
        },
        snackbarHost = { SnackbarHost(hostState = snackbarHostState) },
        floatingActionButton = {
            Button(
                onClick = {
                    val amountValue = amount.replace(Regex("[^\\d]"), "").toDoubleOrNull()
                    if (amountValue == null || amountValue <= 0 || description.isBlank()) {
                        return@Button
                    }
                    val request = TransactionRequest(
                        unitId = selectedUnitId ?: 0L,
                        amount = amountValue,
                        description = description,
                        type = selectedType,
                        method = selectedMethod,
                        category = category,
                        photoUrl = photoUri?.toString(),
                        latitude = null,
                        longitude = null
                    )
                    viewModel.updateTransaction(id, request)
                },
                shape = RoundedCornerShape(28.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary
                ),
                enabled = !isSaving
            ) {
                if (isSaving) {
                    CircularProgressIndicator(
                        color = MaterialTheme.colorScheme.onPrimary,
                        strokeWidth = 2.dp,
                        modifier = Modifier.size(16.dp),
                        strokeCap = StrokeCap.Round
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Menyimpan...")
                } else {
                    Text("Simpan")
                }
            }
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            when (detailState) {
                is DetailUiState.Loading -> {
                    CircularProgressIndicator(
                        modifier = Modifier.align(Alignment.Center),
                        color = MaterialTheme.colorScheme.primary
                    )
                }
                is DetailUiState.Error -> {
                    Text(
                        text = (detailState as DetailUiState.Error).message,
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier.align(Alignment.Center)
                    )
                }
                is DetailUiState.Success -> {
                    val ctx = context
                    val units = listOf(
                        Pair(1L, "Kantor Pusat"),
                        Pair(2L, "Kantin"),
                        Pair(3L, "Koperasi")
                    )

                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState())
                            .padding(16.dp)
                    ) {
                        OutlinedTextField(
                            value = description,
                            onValueChange = { description = it },
                            label = { Text("Keterangan") },
                            modifier = Modifier.fillMaxWidth(),
                            colors = TextFieldDefaults.colors(
                                focusedTextColor = MaterialTheme.colorScheme.onSurface,
                                unfocusedTextColor = MaterialTheme.colorScheme.onSurface,
                                focusedContainerColor = MaterialTheme.colorScheme.surface,
                                unfocusedContainerColor = MaterialTheme.colorScheme.surfaceContainerLowest
                            ),
                            singleLine = false,
                            maxLines = 3
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        Text(
                            text = "Jenis Transaksi",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            listOf(TransactionType.INCOME, TransactionType.EXPENSE).forEach { type ->
                                val isSelected = selectedType == type
                                val bgColor = if (isSelected) {
                                    if (type == TransactionType.INCOME) MaterialTheme.colorScheme.tertiaryContainer
                                    else MaterialTheme.colorScheme.errorContainer
                                } else MaterialTheme.colorScheme.surfaceContainerLowest
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .clickable { selectedType = type }
                                        .background(bgColor, RoundedCornerShape(16.dp))
                                        .border(
                                            width = if (isSelected) 2.dp else 1.dp,
                                            color = if (isSelected) {
                                                if (type == TransactionType.INCOME) MaterialTheme.colorScheme.tertiary
                                                else MaterialTheme.colorScheme.error
                                            } else MaterialTheme.colorScheme.outline,
                                            shape = RoundedCornerShape(16.dp)
                                        )
                                        .padding(16.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        val iconVector: ImageVector = if (type == TransactionType.INCOME) {
                                            Icons.Filled.ArrowDownward
                                        } else {
                                            Icons.Filled.ArrowUpward
                                        }
                                        Icon(
                                            imageVector = iconVector,
                                            contentDescription = null,
                                            tint = if (isSelected) {
                                                if (type == TransactionType.INCOME) MaterialTheme.colorScheme.onTertiaryContainer
                                                else MaterialTheme.colorScheme.onErrorContainer
                                            } else MaterialTheme.colorScheme.onSurfaceVariant,
                                            modifier = Modifier.size(24.dp)
                                        )
                                        Text(
                                            text = if (type == TransactionType.INCOME) "Pemasukan" else "Pengeluaran",
                                            style = MaterialTheme.typography.bodyMedium,
                                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                        )
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        OutlinedTextField(
                            value = amount,
                            onValueChange = { newText ->
                                val digits = newText.replace(Regex("[^\\d]"), "")
                                amount = formatRupiah(digits)
                            },
                            label = { Text("Nominal") },
                            placeholder = { Text("Rp 0") },
                            modifier = Modifier.fillMaxWidth(),
                            colors = TextFieldDefaults.colors(
                                focusedTextColor = MaterialTheme.colorScheme.onSurface,
                                unfocusedTextColor = MaterialTheme.colorScheme.onSurface,
                                focusedContainerColor = MaterialTheme.colorScheme.surface,
                                unfocusedContainerColor = MaterialTheme.colorScheme.surfaceContainerLowest
                            ),
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            textStyle = androidx.compose.ui.text.TextStyle(
                                fontWeight = FontWeight.Bold,
                                fontSize = 18.sp,
                                fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
                            )
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            units.forEach { (uid, name) ->
                                androidx.compose.material3.TextButton(
                                    onClick = { selectedUnitId = uid },
                                    modifier = Modifier
                                        .weight(1f)
                                        .border(
                                            width = if (selectedUnitId == uid) 2.dp else 1.dp,
                                            color = if (selectedUnitId == uid) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline,
                                            shape = RoundedCornerShape(12.dp)
                                        ),
                                    colors = ButtonDefaults.textButtonColors(
                                        containerColor = if (selectedUnitId == uid) {
                                            MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.2f)
                                        } else MaterialTheme.colorScheme.surfaceContainerLowest
                                    )
                                ) {
                                    Text(
                                        text = name,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = if (selectedUnitId == uid) MaterialTheme.colorScheme.primary
                                        else MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            listOf("Tunai", "Transfer Bank", "QRIS", "E-Wallet").forEach { method ->
                                androidx.compose.material3.FilterChip(
                                    selected = selectedMethod == method,
                                    onClick = { selectedMethod = method },
                                    label = { Text(method, style = MaterialTheme.typography.bodySmall) },
                                    colors = androidx.compose.material3.FilterChipDefaults.filterChipColors(
                                        containerColor = if (selectedMethod == method) {
                                            MaterialTheme.colorScheme.secondaryContainer
                                        } else MaterialTheme.colorScheme.surfaceContainerLowest,
                                        labelColor = if (selectedMethod == method) {
                                            MaterialTheme.colorScheme.onSecondaryContainer
                                        } else MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        OutlinedTextField(
                            value = category,
                            onValueChange = { category = it },
                            label = { Text("Kategori") },
                            modifier = Modifier.fillMaxWidth(),
                            colors = TextFieldDefaults.colors(
                                focusedTextColor = MaterialTheme.colorScheme.onSurface,
                                unfocusedTextColor = MaterialTheme.colorScheme.onSurface,
                                focusedContainerColor = MaterialTheme.colorScheme.surface,
                                unfocusedContainerColor = MaterialTheme.colorScheme.surfaceContainerLowest
                            ),
                            singleLine = true
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        OutlinedCard(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(120.dp)
                                .clickable {
                                    val tmpFile = File.createTempFile("IMG_${System.currentTimeMillis()}_", ".jpg", ctx.cacheDir)
                                    val tmpUri = FileProvider.getUriForFile(
                                        ctx,
                                        "${ctx.packageName}.fileprovider",
                                        tmpFile
                                    )
                                    photoUri = tmpUri
                                    cameraLauncher.launch(tmpUri)
                                },
                            shape = RoundedCornerShape(16.dp),
                            border = androidx.compose.foundation.BorderStroke(
                                2.dp,
                                if (photoUri != null) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline
                            )
                        ) {
                            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                if (photoUri != null) {
                                    AsyncImage(
                                        model = photoUri,
                                        contentDescription = "Transaction photo",
                                        modifier = Modifier
                                            .fillMaxSize()
                                            .clip(RoundedCornerShape(14.dp)),
                                        contentScale = ContentScale.Crop
                                    )
                                } else {
                                    Column(
                                        horizontalAlignment = Alignment.CenterHorizontally,
                                        verticalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Rounded.PhotoCamera,
                                            contentDescription = null,
                                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                            modifier = Modifier.size(32.dp)
                                        )
                                        Text(
                                            text = "Ketuk untuk ambil foto",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(80.dp))
                    }
                }
            }
        }
    }
}

private fun formatCurrencyPlain(amount: Double): String {
    val formatter = NumberFormat.getCurrencyInstance(Locale("id", "ID"))
    formatter.minimumFractionDigits = 0
    formatter.maximumFractionDigits = 0
    return formatter.format(amount)
}

private fun formatRupiah(digits: String): String {
    if (digits.isEmpty()) return ""
    val number = digits.toLongOrNull() ?: 0L
    return NumberFormat.getCurrencyInstance(Locale("id", "ID")).format(number)
}
