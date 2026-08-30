package com.brontolano.albafintech

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import com.brontolano.albafintech.ui.navigation.AppContainer
import com.brontolano.albafintech.ui.navigation.AppNavigation
import com.brontolano.albafintech.ui.theme.AlbaFintechTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        AppContainer.init(this)
        enableEdgeToEdge()
        setContent {
            AlbaFintechTheme {
                AppNavigation()
            }
        }
    }
}

@Composable
@Preview(showBackground = true)
fun GreetingPreview() {
    AlbaFintechTheme {
        AppNavigation()
    }
}
