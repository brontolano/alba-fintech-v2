package com.brontolano.albafintech

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.core.view.WindowCompat
import com.brontolano.albafintech.ui.navigation.AppNavigation
import com.brontolano.albafintech.ui.theme.AlbaFintechTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        setContent {
            AlbaFintechTheme {
                AppNavigation()
            }
        }
    }
}
