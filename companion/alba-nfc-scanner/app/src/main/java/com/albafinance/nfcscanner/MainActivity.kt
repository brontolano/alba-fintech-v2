package com.albafinance.nfcscanner

import android.app.Activity
import android.app.PendingIntent
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.tech.MifareClassic
import android.nfc.tech.NfcA
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast

/**
 * ALBA NFC Scanner — aplikasi pendamping mini untuk HP kasir.
 *
 * Tugasnya satu: baca UID kartu MIFARE Classic MENTAH (tanpa NDEF, tanpa
 * kunci, tanpa reader USB) lalu buka browser ke halaman NFC aplikasi web
 * yang langsung mencari santrinya (deep-link ?uid=...).
 *
 * UID terbaca dari anti-collision ISO14443 (tag.getId) — TIDAK butuh
 * autentikasi sektor/kunci apa pun. Batasan hardware tetap berlaku:
 * hanya HP ber-chip NXP; HP Broadcom tidak bisa MIFARE Classic
 * (j native maupun web).
 */
class MainActivity : Activity() {

    companion object {
        /** Ganti bila domain produksi berbeda. */
        const val WEB_URL = "https://alba.brontolano.com/dashboard/nfc?uid="
    }

    private var nfcAdapter: NfcAdapter? = null
    private lateinit var statusView: TextView
    private lateinit var uidView: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(48, 48, 48, 48)
        }
        val title = TextView(this).apply {
            text = "ALBA NFC Scanner"
            textSize = 24f
            gravity = Gravity.CENTER
        }
        statusView = TextView(this).apply {
            textSize = 16f
            gravity = Gravity.CENTER
            setPadding(0, 32, 0, 0)
        }
        uidView = TextView(this).apply {
            textSize = 20f
            gravity = Gravity.CENTER
            setPadding(0, 24, 0, 0)
        }
        val hint = TextView(this).apply {
            text = "Tempelkan kartu ASC ke belakang HP.\nBrowser terbuka + santri langsung ditemukan."
            textSize = 14f
            gravity = Gravity.CENTER
            setPadding(0, 32, 0, 0)
        }
        root.addView(title)
        root.addView(statusView)
        root.addView(uidView)
        root.addView(hint)
        setContentView(root)

        nfcAdapter = NfcAdapter.getDefaultAdapter(this)
        if (nfcAdapter == null) {
            statusView.text = "HP ini tidak punya hardware NFC."
        } else if (nfcAdapter?.isEnabled == false) {
            statusView.text = "Aktifkan NFC di pengaturan HP."
        } else {
            statusView.text = "Siap — tempelkan kartu…"
        }
        handleIntent(intent)
    }

    override fun onResume() {
        super.onResume()
        val adapter = nfcAdapter ?: return
        if (!adapter.isEnabled) return
        val pi = PendingIntent.getActivity(
            this, 0,
            Intent(this, javaClass).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S)
                PendingIntent.FLAG_MUTABLE else 0,
        )
        try {
            adapter.enableForegroundDispatch(
                this, pi, null,
                arrayOf(
                    arrayOf(MifareClassic::class.java.name),
                    arrayOf(NfcA::class.java.name),
                ),
            )
        } catch (_: Exception) {
            // Biarkan status apa adanya; tap via manifest filter tetap jalan.
        }
    }

    override fun onPause() {
        super.onPause()
        try {
            nfcAdapter?.disableForegroundDispatch(this)
        } catch (_: Exception) {
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }

    @Suppress("DEPRECATION")
    private fun getTagLegacy(intent: Intent): Tag? =
        intent.getParcelableExtra(NfcAdapter.EXTRA_TAG)

    private fun handleIntent(intent: Intent?) {
        if (intent == null) return
        val tag: Tag? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            intent.getParcelableExtra(NfcAdapter.EXTRA_TAG, Tag::class.java)
        } else {
            getTagLegacy(intent)
        }
        if (tag == null) return
        val uid = tag.id.joinToString("") { "%02X".format(it) }
        if (uid.isEmpty()) return
        uidView.text = uid
        statusView.text = "Kartu terbaca — membuka data santri…"
        // Cadangan: UID tersalin, tinggal paste bila browser gagal dibuka.
        (getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager)
            ?.setPrimaryClip(ClipData.newPlainText("UID", uid))
        try {
            startActivity(
                Intent(
                    Intent.ACTION_VIEW,
                    Uri.parse(WEB_URL + Uri.encode(uid)),
                ),
            )
        } catch (_: Exception) {
            Toast.makeText(
                this,
                "UID $uid tersalin — browser gagal dibuka, paste manual.",
                Toast.LENGTH_LONG,
            ).show()
        }
    }
}
