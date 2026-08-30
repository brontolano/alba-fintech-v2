package com.brontolano.albafintech.ui.profile

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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AccountBalance
import androidx.compose.material.icons.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material.icons.rounded.ExitToApp
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.brontolano.albafintech.data.model.User
import com.brontolano.albafintech.data.model.UserRole
import com.brontolano.albafintech.ui.navigation.AppViewModel
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.brontolano.albafintech.data.model.User
import com.brontolano.albafintech.data.model.UserRole
import com.brontolano.albafintech.ui.navigation.AppViewModel
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    appViewModel: AppViewModel,
    onNavigateBack: () -> Unit,
    onLogout: () -> Unit
) {
    val currentUser by appViewModel.currentUser.collectAsState()
    val currentRole by appViewModel.currentRole.collectAsState()

    Scaffold(
        topBar = {
            androidx.compose.material3.CenterAlignedTopAppBar(
                title = { androidx.compose.material3.Text("Profil") },
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
        }
    ) { padding ->
        androidx.compose.foundation.layout.Box(
            modifier = androidx.compose.ui.Modifier
                .fillMaxSize()
                .padding(padding)
                .background(androidx.compose.material3.MaterialTheme.colorScheme.background)
        ) {
            androidx.compose.foundation.layout.Column(
                modifier = androidx.compose.ui.Modifier
                    .fillMaxSize()
                    .verticalScroll(androidx.compose.foundation.rememberScrollState())
                    .padding(16.dp)
            ) {
                // Profile Header
                androidx.compose.foundation.layout.Column(
                    modifier = androidx.compose.ui.Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally
                ) {
                    // Avatar
                    androidx.compose.foundation.layout.Box(
                        modifier = androidx.compose.ui.Modifier
                            .size(100.dp)
                            .padding(bottom = 16.dp),
                        contentAlignment = androidx.compose.ui.Alignment.Center
                    ) {
                        val user = currentUser.value
                        if (user?.photoUrl != null && user.photoUrl?.isNotBlank() == true) {
                            coil.compose.AsyncImage(
                                model = user.photoUrl,
                                contentDescription = "Profile photo",
                                modifier = androidx.compose.ui.Modifier
                                    .size(100.dp)
                                    .clip(androidx.compose.foundation.shape.CircleShape),
                                contentScale = androidx.compose.ui.layout.ContentScale.Crop
                            )
                        } else {
                            androidx.compose.foundation.layout.Box(
                                modifier = androidx.compose.ui.Modifier
                                    .size(100.dp)
                                    .background(
                                        color = androidx.compose.material3.MaterialTheme.colorScheme.primaryContainer,
                                        shape = androidx.compose.foundation.shape.CircleShape
                                    )
                            ) {
                                androidx.compose.material3.Icon(
                                    imageVector = androidx.compose.material.icons.rounded.Person,
                                    contentDescription = null,
                                    tint = androidx.compose.material3.MaterialTheme.colorScheme.onPrimaryContainer,
                                    modifier = androidx.compose.ui.Modifier.size(48.dp)
                                )
                            }
                        }
                    }

                    // Name
                    currentUser.value?.name?.let { name ->
                        androidx.compose.material3.Text(
                            text = name,
                            style = androidx.compose.material3.MaterialTheme.typography.headlineMedium,
                            fontWeight = androidx.compose.ui.text.font.FontWeight.Bold,
                            color = androidx.compose.material3.MaterialTheme.colorScheme.onSurface,
                            modifier = androidx.compose.ui.Modifier.padding(top = 16.dp)
                        )
                    }

                    // Role badge
                    currentUser.value?.role?.let { role ->
                        androidx.compose.material3.Badge(
                            containerColor = when (currentRole) {
                                UserRole.SUPERADMIN -> androidx.compose.material3.MaterialTheme.colorScheme.tertiary
                                UserRole.PIMPINAN -> androidx.compose.material3.MaterialTheme.colorScheme.primary
                                UserRole.MANAGER -> androidx.compose.material3.MaterialTheme.colorScheme.secondary
                                UserRole.STAFF -> androidx.compose.material3.MaterialTheme.colorScheme.secondary
                            },
                            contentColor = when (currentRole) {
                                UserRole.SUPERADMIN -> androidx.compose.material3.MaterialTheme.colorScheme.onTertiary
                                UserRole.PIMPINAN -> androidx.compose.material3.MaterialTheme.colorScheme.onPrimary
                                UserRole.MANAGER -> androidx.compose.material3.MaterialTheme.colorScheme.onSecondary
                                UserRole.STAFF -> androidx.compose.material3.MaterialTheme.colorScheme.onSecondary
                            }
                        ) {
                            androidx.compose.material3.Text(
                                text = role.displayName,
                                fontSize = 12.sp,
                                fontWeight = androidx.compose.ui.text.font.FontWeight.Medium,
                                modifier = androidx.compose.ui.Modifier.padding(top = 8.dp)
                            )
                        }
                    }

                    // Unit
                    currentUser.value?.unitName?.let { unitName ->
                        androidx.compose.material3.Text(
                            text = unitName,
                            style = androidx.compose.material3.MaterialTheme.typography.bodyMedium,
                            color = androidx.compose.material3.MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = androidx.compose.ui.Modifier.padding(top = 8.dp)
                        )
                    }
                }

                androidx.compose.material3.Spacer(modifier = androidx.compose.ui.Modifier.height(24.dp))

                // Menu Items
                androidx.compose.foundation.layout.Column(
                    modifier = androidx.compose.ui.Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    verticalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(16.dp)
                ) {
                    ProfileMenuItem(
                        icon = androidx.compose.material.icons.rounded.Person,
                        title = "Informasi Akun",
                        subtitle = "Kelola informasi pribadi Anda",
                        onClick = { /* TODO: navigate to edit profile */ }
                    )

                    ProfileMenuItem(
                        icon = androidx.compose.material.icons.rounded.Security,
                        title = "Keamanan",
                        subtitle = "Ubah kata sandi, keamanan akun",
                        onClick = { /* TODO: navigate to security */ }
                    )

                    ProfileMenuItem(
                        icon = androidx.compose.material.icons.rounded.Notifications,
                        title = "Notifikasi",
                        subtitle = "Kelola preferensi notifikasi",
                        onClick = { /* TODO: navigate to notifications */ }
                    )

                    ProfileMenuItem(
                        icon = androidx.compose.material.icons.rounded.Language,
                        title = "Bahasa",
                        subtitle = "Bahasa Indonesia",
                        onClick = { /* TODO: navigate to language settings */ }
                    )

                    androidx.compose.material3.Spacer(modifier = androidx.compose.ui.Modifier.height(16.dp))

                    // Logout button
                    androidx.compose.material3.FilledTonalButton(
                        onClick = {
                            onLogout()
                        },
                        modifier = androidx.compose.ui.Modifier
                            .fillMaxWidth()
                            .height(56.dp),
                        colors = androidx.compose.material3.ButtonDefaults.filledTonalButtonColors(
                            containerColor = androidx.compose.material3.MaterialTheme.colorScheme.errorContainer,
                            contentColor = androidx.compose.material3.MaterialTheme.colorScheme.onErrorContainer
                        )
                    ) {
                        androidx.compose.material3.Text(
                            text = "Keluar",
                            color = androidx.compose.material3.MaterialTheme.colorScheme.error
                        )
                    }

                    androidx.compose.material3.Spacer(modifier = androidx.compose.ui.Modifier.height(16.dp))

                    // Version info
                    androidx.compose.material3.Text(
                        text = "Versi 1.0.0",
                        style = androidx.compose.material3.MaterialTheme.typography.bodySmall,
                        color = androidx.compose.material3.MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                        modifier = androidx.compose.ui.Modifier
                            .fillMaxWidth()
                            .padding(vertical = 16.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun ProfileMenuItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit
) {
    androidx.compose.material3.Card(
        modifier = androidx.compose.ui.Modifier
            .fillMaxWidth()
            .clickable { /* TODO: navigate */ }
            .padding(16.dp),
        shape = androidx.compose.foundation.shape.RoundedCornerShape(16.dp),
        colors = androidx.compose.material3.CardDefaults.cardColors(
            containerColor = androidx.compose.material3.MaterialTheme.colorScheme.surfaceContainerLowest
        ),
        border = androidx.compose.foundation.BorderStroke(1.dp, androidx.compose.material3.MaterialTheme.colorScheme.outline)
    ) {
        androidx.compose.foundation.layout.Row(
            modifier = androidx.compose.ui.Modifier
                .fillMaxWidth()
                .padding(16.dp)
                .clickable { /* TODO: navigate */ },
            verticalAlignment = androidx.compose.ui.Alignment.CenterVertically
        ) {
            androidx.compose.material3.Icon(
                imageVector = androidx.compose.material.icons.rounded.Person,
                contentDescription = null,
                tint = androidx.compose.material3.MaterialTheme.colorScheme.primary,
                modifier = androidx.compose.ui.Modifier.size(24.dp)
            )
            androidx.compose.foundation.layout.Spacer(modifier = androidx.compose.ui.Modifier.width(16.dp))
            androidx.compose.foundation.layout.Column(
                modifier = androidx.compose.ui.Modifier
                    .fillMaxWidth()
                    .padding(start = 16.dp),
                verticalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(4.dp)
            ) {
                androidx.compose.material3.Text(
                    text = "Informasi Akun",
                    style = androidx.compose.material3.MaterialTheme.typography.titleMedium,
                    fontWeight = androidx.compose.ui.text.font.FontWeight.Medium,
                    color = androidx.compose.material3.MaterialTheme.colorScheme.onSurface
                )
                androidx.compose.material3.Text(
                    text = "Kelola informasi pribadi Anda",
                    style = androidx.compose.material3.MaterialTheme.typography.bodySmall,
                    color = androidx.compose.material3.MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
@Preview(showBackground = true)
fun ProfileScreenPreview() {
    com.brontolano.albafintech.ui.theme.AlbaFintechTheme {
        androidx.compose.material3.Surface {
            ProfileScreen(
                appViewModel = androidx.lifecycle.viewmodel.compose.viewModel(),
                onNavigateBack = {},
                onLogout = {}
            )
        }
    }
}