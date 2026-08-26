package com.brontolano.albafintech

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.brontolano.albafintech.ui.screens.MainScreen
import com.brontolano.albafintech.ui.theme.AlbaFintechTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            AlbaFintechTheme {
                MainScreen()
            }
        }
    }
}
