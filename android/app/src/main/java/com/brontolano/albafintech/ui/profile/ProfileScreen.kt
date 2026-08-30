package com.brontolano.albafintech.ui.profile

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Badge
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material3.Badge as M3Badge
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.brontolano.albafintech.data.model.UserRole
import com.brontolano.albafintech.ui.components.BottomNavHeight
import com.brontolano.albafintech.ui.navigation.AppViewModel

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
            CenterAlignedTopAppBar(
                title = { Text("Profil") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.Filled.Close,
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
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(
                    top = innerPadding.calculateTopPadding(),
                    start = 16.dp,
                    end = 16.dp,
                    // Lift content above the bottom bar.
                    bottom = innerPadding.calculateBottomPadding() + BottomNavHeight
                )
                .background(MaterialTheme.colorScheme.background)
        ) {
            ProfileHeader(
                name = currentUser?.name,
                role = currentRole,
                unitName = currentUser?.unitName
            )

            Spacer(modifier = Modifier.height(8.dp))

            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                ProfileMenuItem(icon = Icons.Filled.Badge, title = "Informasi Akun", subtitle = "Kelola informasi pribadi Anda")
            ProfileMenuItem(icon = Icons.Filled.Security, title = "Keamanan", subtitle = "Ubah kata sandi, keamanan akun")
            ProfileMenuItem(icon = Icons.Filled.Notifications, title = "Notifikasi", subtitle = "Kelola preferensi notifikasi")
            ProfileMenuItem(icon = Icons.Filled.Language, title = "Bahasa", subtitle = "Bahasa Indonesia")
            }

            Spacer(modifier = Modifier.height(24.dp))

            FilledTonalButton(
                onClick = onLogout,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                colors = androidx.compose.material3.ButtonDefaults.filledTonalButtonColors(
                    containerColor = MaterialTheme.colorScheme.errorContainer,
                    contentColor = MaterialTheme.colorScheme.onErrorContainer
                )
            ) {
                Text(
                    text = "Keluar",
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.SemiBold
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "Versi 1.0.0",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

@Composable
private fun ProfileHeader(
    name: String?,
    role: UserRole,
    unitName: String?
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Avatar
        Box(
            modifier = Modifier
                .size(100.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primaryContainer),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Filled.Person,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onPrimaryContainer,
                modifier = Modifier.size(48.dp)
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = name.ifNullOrBlank("Pengguna"),
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )

        M3Badge(
            containerColor = roleBadgeColor(role),
            contentColor = roleBadgeOnColor(role),
            modifier = Modifier
                .height(24.dp)
                .padding(top = 8.dp)
        ) {
            Text(
                text = role.displayName,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                color = roleBadgeOnColor(role)
            )
        }

        if (!unitName.isNullOrBlank()) {
            Text(
                text = unitName,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 8.dp)
            )
        }
    }
}

@Composable
fun roleBadgeColor(role: UserRole): Color {
    return when (role) {
        UserRole.SUPERADMIN -> MaterialTheme.colorScheme.primary
        UserRole.PIMPINAN -> MaterialTheme.colorScheme.secondary
        UserRole.MANAGER -> MaterialTheme.colorScheme.tertiary
        UserRole.STAFF -> MaterialTheme.colorScheme.surfaceContainerHigh
    }
}

@Composable
fun roleBadgeOnColor(role: UserRole): Color {
    return when (role) {
        UserRole.SUPERADMIN -> MaterialTheme.colorScheme.onPrimary
        UserRole.PIMPINAN -> MaterialTheme.colorScheme.onSecondary
        UserRole.MANAGER -> MaterialTheme.colorScheme.onTertiary
        UserRole.STAFF -> MaterialTheme.colorScheme.onSurfaceVariant
    }
}

private fun String?.ifNullOrBlank(default: String): String =
    if (this.isNullOrBlank()) default else this

@Composable
fun ProfileMenuItem(
    icon: ImageVector,
    title: String,
    subtitle: String
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { /* TODO: navigate */ },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLowest
        ),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(24.dp)
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Icon(
                imageVector = Icons.Filled.ArrowForward,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f),
                modifier = Modifier.size(20.dp)
            )
        }
    }
}

// Extension property to provide displayName for UserRole
private val UserRole.displayName: String
    get() = when (this) {
        UserRole.SUPERADMIN -> "Super Admin"
        UserRole.PIMPINAN -> "Pimpinan"
        UserRole.MANAGER -> "Manager"
        UserRole.STAFF -> "Staff"
    }