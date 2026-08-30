package com.brontolano.albafintech.ui.profile

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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.AutoMirrored.Rounded.ArrowBack
import androidx.compose.material.icons.rounded.Badge
import androidx.compose.material.icons.rounded.Language
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.Security
import androidx.compose.material3.Badge
import androidx.compose.material3.CenterAlignedTopAppBar
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.brontolano.albafintech.data.model.UserRole
import com.brontolano.albafintech.ui.components.BottomNavHeight
import com.brontolano.albafintech.ui.navigation.AppViewModel

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
            // ---- Profile header ----
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Avatar
                Box(
                    modifier = Modifier
                        .size(100.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Box(
                        modifier = Modifier
                            .size(100.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.primaryContainer),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Person,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onPrimaryContainer,
                            modifier = Modifier.size(48.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Name
                val name = currentUser?.name
                Text(
                    text = name.ifNullOrBlank { "Pengguna" },
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )

                // Role badge
                Badge(
                    containerColor = roleBadgeColor(currentRole),
                    contentColor = roleBadgeOnColor(currentRole),
                    modifier = Modifier
                        .height(24.dp)
                        .padding(top = 8.dp)
                        .clip(CircleShape)
                ) {
                    Text(
                        text = currentRole.displayName,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = roleBadgeOnColor(currentRole)
                    )
                }

                // Unit
                val unitName = currentUser?.unitName
                if (!unitName.isNullOrBlank()) {
                    Text(
                        text = unitName,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 8.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // ---- Menu items ----
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                ProfileMenuItem(icon = Badge, title = "Informasi Akun", subtitle = "Kelola informasi pribadi Anda")
                ProfileMenuItem(icon = Security, title = "Keamanan", subtitle = "Ubah kata sandi, keamanan akun")
                ProfileMenuItem(icon = Notifications, title = "Notifikasi", subtitle = "Kelola preferensi notifikasi")
                ProfileMenuItem(icon = Language, title = "Bahasa", subtitle = "Bahasa Indonesia")
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Logout
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

            // Version
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
private fun ProfileMenuItem(
    icon: ImageVector,
    title: String,
    subtitle: String
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clip(Shapes.medium),
        shape = Shapes.medium,
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
                imageVector = androidx.compose.material.icons.AutoMirrored.Rounded.ArrowForward,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f),
                modifier = Modifier.size(20.dp)
            )
        }
    }
}

@Composable
private fun roleBadgeColor(role: UserRole): androidx.compose.ui.graphics.Color {
    return when (role) {
        UserRole.SUPERADMIN -> MaterialTheme.colorScheme.tertiary
        UserRole.PIMPINAN -> MaterialTheme.colorScheme.primary
        UserRole.MANAGER -> MaterialTheme.colorScheme.secondary
        UserRole.STAFF -> MaterialTheme.colorScheme.secondary
    }
}

@Composable
private fun roleBadgeOnColor(role: UserRole): androidx.compose.ui.graphics.Color {
    return when (role) {
        UserRole.SUPERADMIN -> MaterialTheme.colorScheme.onTertiary
        UserRole.PIMPINAN -> MaterialTheme.colorScheme.onPrimary
        UserRole.MANAGER -> MaterialTheme.colorScheme.onSecondary
        UserRole.STAFF -> MaterialTheme.colorScheme.onSecondary
    }
}

private val Shapes = androidx.compose.material3.Shapes

private val Shapes.medium: androidx.compose.material3.CornerBasedShape
    get() = androidx.compose.material3.CornerBasedShape(
        topStart = androidx.compose.ui.unit.DpOffset(0f, 0f).let { _ -> androidx.compose.foundation.shape.RoundedCornerShape(16.dp) },
        topEnd = androidx.compose.foundation.shape.RoundedCornerShape(16.dp),
        bottomStart = androidx.compose.foundation.shape.RoundedCornerShape(16.dp),
        bottomEnd = androidx.compose.foundation.shape.RoundedCornerShape(16.dp)
    )

private fun String.ifNullOrBlank(defaultValue: String): String =
    if (isNullOrBlank()) defaultValue else this

@Composable
@androidx.compose.ui.tooling.preview.Preview(
    showBackground = true,
    device = "spec:parent=mobile,shape=Normal,width=412,height=892,unit=dp,device=pixel_5"
)
fun ProfileScreenPreview() {
    val context = androidx.compose.ui.platform.LocalContext.current
    com.brontolano.albafintech.ui.navigation.AppContainer.init(context)
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
