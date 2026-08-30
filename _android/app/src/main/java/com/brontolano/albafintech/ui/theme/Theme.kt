package com.brontolano.albafintech.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

// Fallback color palette (Material 3 baseline purple/blue) used when dynamic color is unavailable
val Purple80 = Color(0xFFB199E8)
val PurpleGrey80 = Color(0xFFC6A8E3)
val Pink80 = Color(0xFFF3B9D1)
val Purple40 = Color(0xFF7B59B6)
val PurpleGrey40 = Color(0xFF8E6DB5)
val Pink40 = Color(0xFFC95C8A)

// Expressive fallback color scheme tokens
val ExpressivePrimary = Color(0xFF6A5ACD)
val ExpressiveOnPrimary = Color(0xFFFFFFFF)
val ExpressiveSecondary = Color(0xFF00B4D8)
val ExpressiveOnSecondary = Color(0xFFFFFFFF)
val ExpressiveTertiary = Color(0xFFFF9800)
val ExpressiveOnTertiary = Color(0xFFFFFFFF)

@Composable
fun AlbaFintechTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit
) {
    val colorScheme: ColorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context)
            else dynamicLightColorScheme(context)
        }
        darkTheme -> darkColorScheme(
            primary = ExpressivePrimary,
            onPrimary = ExpressiveOnPrimary,
            secondary = ExpressiveSecondary,
            onSecondary = ExpressiveOnSecondary,
            tertiary = ExpressiveTertiary,
            onTertiary = ExpressiveOnTertiary,
        )
        else -> lightColorScheme(
            primary = Purple40,
            onPrimary = Color(0xFFFFFFFF),
            secondary = ExpressiveSecondary,
            onSecondary = Color(0xFFFFFFFF),
            tertiary = ExpressiveTertiary,
            onTertiary = Color(0xFFFFFFFF),
        )
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = MaterialTheme.typography,
        content = content
    )
}
