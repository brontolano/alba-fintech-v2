package com.brontolano.albafintech

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.Composable
import androidx.compose.ui.viewinterop.AndroidView
import com.brontolano.albafintech.ui.theme.AlbaFintechTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            AlbaFintechTheme {
                WebViewScreen(url = "https://alba.brontolano.com/login")
            }
        }
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun WebViewScreen(url: String) {
    AndroidView(
        factory = { context ->
            WebView(context).apply {
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                settings.databaseEnabled = true
                settings.allowFileAccess = false
                settings.allowContentAccess = false
                settings.loadsImagesAutomatically = true
                settings.useWideViewPort = true
                settings.loadWithOverviewMode = true
                // Force no-cache so APK WebView always loads latest web changes
                settings.cacheMode = WebSettings.LOAD_NO_CACHE
                settings.setSupportMultipleWindows(true)
                webViewClient = WebViewClient()
                webChromeClient = WebChromeClient()
                loadUrl(url)
            }
        }
    )
}
