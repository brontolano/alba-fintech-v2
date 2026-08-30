package com.brontolano.albafintech.ui.transaction

import android.Manifest
import android.content.pm.PackageManager
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.material.icons.filled.ArrowDownward
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material.icons.rounded.MyLocation
import androidx.compose.material.icons.rounded.PhotoCamera
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextFieldDefaults
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.tooling.preview.Preview
import com.brontolano.albafintech.ui.theme.AlbaFintechTheme
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import coil.compose.AsyncImage
import com.brontolano.albafintech.data.model.TransactionType
import com.brontolano.albafintech.data.model.Unit as UnitModel
import com.brontolano.albafintech.ui.navigation.AppContainer
import com.brontolano.albafintech.ui.navigation.LocalSnackbarHostState
import com.brontolano.albafintech.util.CameraCaptureUtil
import com.google.android.gms.location.LocationServices
import java.text.NumberFormat
import java.util.Locale

/**
 * Screen for creating a new transaction.
 *
 * Features:
 * - Unit dropdown populated from GET /api/units (with fallback to defaults)
 * - Amount field with numeric input and inline validation (rejects <= 0)
 * - Description field with inline validation (requires non-empty)
 * - Category, transaction type (income/expense), and payment method fields
 * - Camera capture via CameraX system intent (saved to temp file via FileProvider)
 * - Photo preview thumbnail after capture
 * - Optional latitude/longitude from device GPS
 * - Cancel button to discard changes
 * - Save button with full validation and API integration (POST /api/transactions)
 *
 * Navigation: On successful creation, emits a NavigateBack event so the
 * caller can pop back to the TransactionListScreen.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateTransactionScreen(
    viewModel: CreateTransactionViewModel,
    onNavigateBack: () -> Unit,
    onTransactionCreated: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val event by viewModel.eventFlow.collectAsState()
    val context = LocalContext.current
    val snackbarHostState = LocalSnackbarHostState.current

    // Load units on first composition
    LaunchedEffect(Unit) {
        viewModel.loadUnits()
    }

    // Handle one-shot events: navigation and snackbar messages
    LaunchedEffect(event) {
        event?.let { e ->
            when (e) {
                is CreateTransactionEvent.NavigateBack -> {
                    viewModel.clearEvent()
                    onTransactionCreated()
                }
                is CreateTransactionEvent.ShowMessage -> {
                    snackbarHostState.showSnackbar(e.message)
                    viewModel.clearEvent()
                }
            }
        }
    }

    // Camera launcher — captures photo to a temp file via CameraCaptureUtil
    var pendingPhotoUri by remember { mutableStateOf<Uri?>(null) }

    val cameraLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicture()
    ) { success ->
        if (success && pendingPhotoUri != null) {
            viewModel.setPhotoUri(pendingPhotoUri)
        } else {
            viewModel.setPhotoUri(null)
        }
        pendingPhotoUri = null
    }

    // Location permission launcher
    val locationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            fetchLastLocation(context) { lat, lng ->
                viewModel.setLocation(lat, lng)
            }
        }
    }

    // Dropdown state
    var unitDropdownExpanded by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text("Tambah Transaksi") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.Rounded.Close,
                            contentDescription = "Batal",
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
        snackbarHost = { SnackbarHost(hostState = snackbarHostState) },
        floatingActionButton = {
            Button(
                onClick = { viewModel.createTransaction() },
                enabled = !uiState.isCreating && !uiState.isLoadingUnits,
                shape = RoundedCornerShape(28.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary,
                    disabledContainerColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.12f),
                    disabledContentColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.38f)
                )
            ) {
                if (uiState.isCreating) {
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
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(padding)
                .padding(16.dp)
        ) {
            // ======================== Unit Dropdown ========================
            Text(
                text = "Unit",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Medium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(8.dp))

            ExposedDropdownMenuBox(
                expanded = unitDropdownExpanded,
                onExpandedChange = {
                    if (!uiState.isLoadingUnits) {
                        unitDropdownExpanded = !unitDropdownExpanded
                    }
                }
            ) {
                OutlinedTextField(
                    value = uiState.selectedUnit?.name ?: "",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Pilih Unit") },
                    placeholder = { Text("Pilih unit") },
                    trailingIcon = {
                        ExposedDropdownMenuDefaults.TrailingIcon(expanded = unitDropdownExpanded)
                    },
                    colors = ExposedDropdownMenuDefaults.outlinedTextFieldColors(),
                    enabled = !uiState.isLoadingUnits,
                    isError = uiState.unitError != null,
                    supportingText = {
                        uiState.unitError?.let { error ->
                            Text(
                                text = error,
                                color = MaterialTheme.colorScheme.error,
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                    },
                    singleLine = true,
                    modifier = Modifier
                        .fillMaxWidth()
                )

                DropdownMenu(
                    expanded = unitDropdownExpanded,
                    onDismissRequest = { unitDropdownExpanded = false }
                ) {
                    if (uiState.isLoadingUnits) {
                        DropdownMenuItem(
                            onClick = {},
                            text = { Text("Memuat unit...", style = MaterialTheme.typography.bodyMedium) },
                            enabled = false
                        )
                    } else {
                        uiState.units.forEach { unit ->
                            val isSelected = uiState.selectedUnit?.id == unit.id
                            DropdownMenuItem(
                                text = {
                                    Text(
                                        text = unit.name,
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                        color = if (isSelected) {
                                            MaterialTheme.colorScheme.primary
                                        } else {
                                            MaterialTheme.colorScheme.onSurface
                                        }
                                    )
                                },
                                onClick = {
                                    viewModel.selectUnit(unit)
                                    unitDropdownExpanded = false
                                },
                                trailingIcon = {
                                    if (isSelected) {
                                        Icon(
                                            imageVector = Icons.Rounded.Check,
                                            contentDescription = null,
                                            tint = MaterialTheme.colorScheme.primary
                                        )
                                    }
                                }
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // ======================== Description ========================
            OutlinedTextField(
                value = uiState.description,
                onValueChange = { viewModel.updateDescription(it) },
                label = { Text("Judul / Keterangan Transaksi") },
                placeholder = { Text("Contoh: Pembayaran SPP Bulan Juli") },
                modifier = Modifier.fillMaxWidth(),
                isError = uiState.descriptionError != null,
                supportingText = {
                    uiState.descriptionError?.let { error ->
                        Text(
                            text = error,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                },
                colors = TextFieldDefaults.colors(
                    focusedTextColor = MaterialTheme.colorScheme.onSurface,
                    unfocusedTextColor = MaterialTheme.colorScheme.onSurface,
                    focusedContainerColor = MaterialTheme.colorScheme.surface,
                    unfocusedContainerColor = MaterialTheme.colorScheme.surfaceContainerLowest,
                    cursorColor = MaterialTheme.colorScheme.primary,
                    focusedIndicatorColor = MaterialTheme.colorScheme.primary,
                    unfocusedIndicatorColor = MaterialTheme.colorScheme.outline,
                    errorIndicatorColor = MaterialTheme.colorScheme.error
                ),
                singleLine = false,
                maxLines = 3
            )

            Spacer(modifier = Modifier.height(24.dp))

            // ======================== Transaction Type ========================
            Text(
                text = "Jenis Transaksi",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Medium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                val types = listOf(TransactionType.INCOME, TransactionType.EXPENSE)
                types.forEach { type ->
                    val isSelected = uiState.type == type
                    val bgColor = if (isSelected) {
                        if (type == TransactionType.INCOME) {
                            MaterialTheme.colorScheme.tertiaryContainer
                        } else {
                            MaterialTheme.colorScheme.errorContainer
                        }
                    } else {
                        MaterialTheme.colorScheme.surfaceContainerLowest
                    }
                    val contentColor = if (isSelected) {
                        if (type == TransactionType.INCOME) {
                            MaterialTheme.colorScheme.onTertiaryContainer
                        } else {
                            MaterialTheme.colorScheme.onErrorContainer
                        }
                    } else {
                        MaterialTheme.colorScheme.onSurfaceVariant
                    }

                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clickable { viewModel.updateType(type) }
                            .background(bgColor, RoundedCornerShape(16.dp))
                            .border(
                                width = if (isSelected) 2.dp else 1.dp,
                                color = if (isSelected) {
                                    if (type == TransactionType.INCOME) {
                                        MaterialTheme.colorScheme.tertiary
                                    } else {
                                        MaterialTheme.colorScheme.error
                                    }
                                } else {
                                    MaterialTheme.colorScheme.outline
                                },
                                shape = RoundedCornerShape(16.dp)
                            )
                            .padding(16.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                imageVector = if (type == TransactionType.INCOME) {
                                    Icons.Filled.ArrowDownward
                                } else {
                                    Icons.Filled.ArrowUpward
                                },
                                contentDescription = null,
                                tint = contentColor,
                                modifier = Modifier.size(24.dp)
                            )
                            Text(
                                text = if (type == TransactionType.INCOME) "Pemasukan" else "Pengeluaran",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                color = contentColor
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // ======================== Amount ========================
            OutlinedTextField(
                value = uiState.amount,
                onValueChange = { newText ->
                    val digits = newText.replace(Regex("[^\\d]"), "")
                    val formatted = formatRupiah(digits)
                    viewModel.updateAmount(formatted)
                },
                label = { Text("Nominal") },
                placeholder = { Text("Rp 0") },
                modifier = Modifier.fillMaxWidth(),
                isError = uiState.amountError != null,
                supportingText = {
                    uiState.amountError?.let { error ->
                        Text(
                            text = error,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                },
                colors = TextFieldDefaults.colors(
                    focusedTextColor = MaterialTheme.colorScheme.onSurface,
                    unfocusedTextColor = MaterialTheme.colorScheme.onSurface,
                    focusedContainerColor = MaterialTheme.colorScheme.surface,
                    unfocusedContainerColor = MaterialTheme.colorScheme.surfaceContainerLowest,
                    cursorColor = MaterialTheme.colorScheme.primary,
                    focusedIndicatorColor = MaterialTheme.colorScheme.primary,
                    unfocusedIndicatorColor = MaterialTheme.colorScheme.outline,
                    errorIndicatorColor = MaterialTheme.colorScheme.error
                ),
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                textStyle = TextStyle(
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    fontFamily = FontFamily.Monospace
                )
            )

            Spacer(modifier = Modifier.height(24.dp))

            // ======================== Payment Method ========================
            Text(
                text = "Metode Pembayaran",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Medium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                listOf("Tunai", "Transfer Bank", "QRIS", "E-Wallet").forEach { method ->
                    val isSelected = uiState.method == method
                    FilterChip(
                        selected = isSelected,
                        onClick = { viewModel.updateMethod(method) },
                        label = { Text(method, style = MaterialTheme.typography.bodySmall) },
                        colors = FilterChipDefaults.filterChipColors(
                            containerColor = if (isSelected) {
                                MaterialTheme.colorScheme.secondaryContainer
                            } else {
                                MaterialTheme.colorScheme.surfaceContainerLowest
                            },
                            labelColor = if (isSelected) {
                                MaterialTheme.colorScheme.onSecondaryContainer
                            } else {
                                MaterialTheme.colorScheme.onSurfaceVariant
                            }
                        ),
                        shape = RoundedCornerShape(12.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // ======================== Category ========================
            OutlinedTextField(
                value = uiState.category,
                onValueChange = { viewModel.updateCategory(it) },
                label = { Text("Kategori") },
                placeholder = { Text("Contoh: Operasional, Gaji, dll.") },
                modifier = Modifier.fillMaxWidth(),
                colors = TextFieldDefaults.colors(
                    focusedTextColor = MaterialTheme.colorScheme.onSurface,
                    unfocusedTextColor = MaterialTheme.colorScheme.onSurface,
                    focusedContainerColor = MaterialTheme.colorScheme.surface,
                    unfocusedContainerColor = MaterialTheme.colorScheme.surfaceContainerLowest,
                    cursorColor = MaterialTheme.colorScheme.primary,
                    focusedIndicatorColor = MaterialTheme.colorScheme.primary,
                    unfocusedIndicatorColor = MaterialTheme.colorScheme.outline
                ),
                singleLine = true
            )

            Spacer(modifier = Modifier.height(24.dp))

            // ======================== Photo Capture (CameraX) ========================
            Text(
                text = "Foto Bukti Transaksi (Opsional)",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Medium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(8.dp))

            OutlinedCard(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(160.dp)
                    .clickable {
                        // Use CameraCaptureUtil to create a temp file + FileProvider URI
                        val tempUri = CameraCaptureUtil.createImageUri(context).second
                        pendingPhotoUri = tempUri
                        cameraLauncher.launch(tempUri)
                    },
                shape = RoundedCornerShape(16.dp),
                border = androidx.compose.foundation.BorderStroke(
                    2.dp,
                    if (uiState.photoUri != null) {
                        MaterialTheme.colorScheme.primary
                    } else {
                        MaterialTheme.colorScheme.outline
                    }
                ),
                colors = CardDefaults.outlinedCardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceContainerLowest
                )
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(8.dp)
                ) {
                    if (uiState.photoUri != null) {
                        AsyncImage(
                            model = uiState.photoUri,
                            contentDescription = "Foto bukti transaksi",
                            modifier = Modifier
                                .fillMaxSize()
                                .clip(RoundedCornerShape(12.dp)),
                            contentScale = ContentScale.Crop,
                            placeholder = null,
                            error = null
                        )

                        // Clear photo button
                        IconButton(
                            onClick = { viewModel.clearPhoto() },
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .size(32.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Rounded.Delete,
                                contentDescription = "Hapus foto",
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    } else {
                        Column(
                            modifier = Modifier.align(Alignment.Center),
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

            Spacer(modifier = Modifier.height(24.dp))

            // ======================== Location (GPS) ========================
            Text(
                text = "Lokasi (Opsional)",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Medium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(8.dp))

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                TextButton(
                    onClick = {
                        when {
                            ContextCompat.checkSelfPermission(
                                context,
                                Manifest.permission.ACCESS_FINE_LOCATION
                            ) == PackageManager.PERMISSION_GRANTED -> {
                                fetchLastLocation(context) { lat, lng ->
                                    viewModel.setLocation(lat, lng)
                                }
                            }
                            else -> {
                                locationPermissionLauncher.launch(
                                    Manifest.permission.ACCESS_FINE_LOCATION
                                )
                            }
                        }
                    },
                    modifier = Modifier
                        .border(
                            1.dp,
                            MaterialTheme.colorScheme.outline,
                            RoundedCornerShape(12.dp)
                        )
                        .padding(vertical = 8.dp, horizontal = 12.dp)
                ) {
                    Icon(
                        imageVector = Icons.Rounded.MyLocation,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "Ambil Lokasi",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                }

                if (uiState.latitude != null && uiState.longitude != null) {
                    Text(
                        text = "Lat: ${"%.4f".format(uiState.latitude)}, Lng: ${"%.4f".format(uiState.longitude)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    IconButton(
                        onClick = { viewModel.clearLocation() },
                        modifier = Modifier
                            .size(24.dp)
                            .padding(0.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Rounded.Close,
                            contentDescription = "Hapus lokasi",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(14.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(80.dp))
        }
    }
}

/**
 * Fetches the last known location using FusedLocationProviderClient.
 * Calls [onLocation] with latitude and longitude when available.
 */
private fun fetchLastLocation(
    context: android.content.Context,
    onLocation: (Double, Double) -> Unit
) {
    val fusedLocationClient = LocationServices.getFusedLocationProviderClient(context)
    try {
        fusedLocationClient.lastLocation
            .addOnSuccessListener { location ->
                if (location != null) {
                    onLocation(location.latitude, location.longitude)
                }
            }
            .addOnFailureListener {
                // Location unavailable — silently ignore
            }
    } catch (e: SecurityException) {
        // Permission not granted — silently ignore
    }
}

/**
 * Formats digit-only input as Indonesian Rupiah currency.
 * e.g. "1000000" → "Rp1.000.000"
 */
private fun formatRupiah(digits: String): String {
    if (digits.isEmpty()) return ""
    val number = digits.toLongOrNull() ?: 0L
    return NumberFormat.getCurrencyInstance(Locale("id", "ID")).format(number)
}

// ======================== Previews ========================

@OptIn(ExperimentalMaterial3Api::class)
@Preview(
    name = "Create Transaction Screen (Light)",
    showBackground = true,
    device = "spec:parent=mobile,shape=Normal,width=412,height=892,unit=dp,device=pixel_5"
)
@Composable
fun CreateTransactionScreenPreview() {
    val context = LocalContext.current
    AppContainer.init(context)
    AlbaFintechTheme {
        CreateTransactionScreen(
            viewModel = CreateTransactionViewModel(),
            onNavigateBack = {},
            onTransactionCreated = {}
        )
    }
}