package com.brontolano.albafintech.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Dashboard
import androidx.compose.material.icons.outlined.PendingActions
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.ReceiptLong
import androidx.compose.material.icons.rounded.Dashboard
import androidx.compose.material.icons.rounded.PendingActions
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.ReceiptLong

/**
 * Height of the bottom navigation bar (including labels) on mobile.
 *
 * Top-level screen scrollables should add this as extra bottom padding so that
 * content is never drawn underneath the navigation bar. The system navigation
 * bar insets are already handled by each screen's own `Scaffold`, so callers
 * only need to account for this height on top-level destinations.
 */
val BottomNavHeight = 80.dp

/**
 * A single destination in the bottom navigation bar.
 *
 * @param title Human readable label shown under the icon.
 * @param selectedIcon Icon shown when this destination is active.
 * @param unselectedIcon Icon shown when this destination is inactive.
 * @param route Stable String identifier used to track the selected destination.
 */
data class NavItem(
    val title: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector,
    val route: String
)

/**
 * The four top-level destinations for the Alba Fintech app, ordered as they
 * appear in the bottom navigation bar:
 * 1. Dashboard
 * 2. Transactions
 * 3. Approvals
 * 4. Profile
 *
 * Each item uses `material-icons-extended` Rounded / Outlined variants so the
 * selected / unselected states are visually distinct.
 */
val AlbaBottomNavItems: List<NavItem> = listOf(
    NavItem(
        title = "Dashboard",
        selectedIcon = Icons.Rounded.Dashboard,
        unselectedIcon = Icons.Outlined.Dashboard,
        route = "dashboard"
    ),
    NavItem(
        title = "Transaksi",
        selectedIcon = Icons.Rounded.ReceiptLong,
        unselectedIcon = Icons.Outlined.ReceiptLong,
        route = "transactions"
    ),
    NavItem(
        title = "Persetujuan",
        selectedIcon = Icons.Rounded.PendingActions,
        unselectedIcon = Icons.Outlined.PendingActions,
        route = "approvals"
    ),
    NavItem(
        title = "Profil",
        selectedIcon = Icons.Rounded.Person,
        unselectedIcon = Icons.Outlined.Person,
        route = "profile"
    )
)

/**
 * Material 3 bottom navigation bar for Alba Fintech.
 *
 * Renders the provided [items] and highlights the one matching [selectedRoute].
 * [onNavigate] is invoked with the tapped item's [NavItem.route]; the caller
 * maps that route to a [androidx.navigation3.runtime.NavKey] and switches the
 * Navigation 3 back stack accordingly.
 *
 * The `NavigationBar` handles the system navigation-bar insets itself, so it
 * should be anchored at the bottom of a `Box` (e.g. with `Modifier.align(...)`).
 * The `NavigationBar` enforces a 48 dp minimum touch target per item.
 */
@Composable
fun BottomNavigationBar(
    items: List<NavItem>,
    selectedRoute: String,
    onNavigate: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    NavigationBar(
        modifier = modifier,
        containerColor = MaterialTheme.colorScheme.surfaceContainerLowest,
        tonalElevation = 8.dp
    ) {
        items.forEach { item ->
            val selected = selectedRoute == item.route
            NavigationBarItem(
                selected = selected,
                onClick = { onNavigate(item.route) },
                icon = {
                    Icon(
                        imageVector = if (selected) item.selectedIcon else item.unselectedIcon,
                        contentDescription = item.title,
                        modifier = Modifier.size(20.dp)
                    )
                },
                label = {
                    Text(
                        text = item.title,
                        style = MaterialTheme.typography.bodySmall,
                        maxLines = 1
                    )
                }
            )
        }
    }
}

@Composable
fun SectionHeader(
    title: String,
    actionText: String? = null,
    onActionClick: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )
        actionText?.let { text ->
            Text(
                text = text,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.primary
            )
        }
    }
}
