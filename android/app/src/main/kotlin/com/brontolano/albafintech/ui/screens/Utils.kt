package com.brontolano.albafintech.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Currency
import java.util.Locale

/**
 * Format amount as Indonesian Rupiah without decimal fraction.
 */
fun formatCurrency(amount: Double): String {
    val formatter = NumberFormat.getCurrencyInstance(Locale("id", "ID"))
    formatter.currency = Currency.getInstance("IDR")
    formatter.minimumFractionDigits = 0
    formatter.maximumFractionDigits = 0
    return formatter.format(amount)
}

/**
 * Status badge showing the approval/transaction status with appropriate colors.
 */
@Composable
fun StatusBadge(status: String) {
    val (bgColor, label, textColor) = when (status.uppercase()) {
        "PENDING" -> Triple(Color(0xFFFEF3C7), "Menunggu", Color(0xFF92400E))
        "APPROVED" -> Triple(Color(0xFFDCFCE7), "Disetujui", Color(0xFF166534))
        "REJECTED" -> Triple(Color(0xFFFEE2E2), "Ditolak", Color(0xFF991B1B))
        "DRAFT" -> Triple(Color(0xFFE5E7EB), "Draft", Color(0xFF374151))
        "INCOME" -> Triple(Color(0xFFDCFCE7), "Pemasukan", Color(0xFF166534))
        "EXPENSE" -> Triple(Color(0xFFFEE2E2), "Pengeluaran", Color(0xFF991B1B))
        else -> Triple(MaterialTheme.colorScheme.surface, status, MaterialTheme.colorScheme.onSurface)
    }
    Box(
        modifier = Modifier
            .background(bgColor, shape = RoundedCornerShape(4.dp))
            .padding(horizontal = 8.dp, vertical = 2.dp)
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = textColor,
            fontWeight = FontWeight.Medium
        )
    }
}

/**
 * Transaction type badge (INCOME/EXPENSE).
 */
@Composable
fun TransactionTypeBadge(type: String?) {
    val (bgColor, textColor) = when (type) {
        "INCOME" -> Color(0xFFDCFCE7) to Color(0xFF166534)
        "EXPENSE" -> Color(0xFFFEE2E2) to Color(0xFF991B1B)
        else -> MaterialTheme.colorScheme.surface to MaterialTheme.colorScheme.onSurface
    }
    Box(
        modifier = Modifier
            .background(bgColor, shape = MaterialTheme.shapes.small)
            .padding(horizontal = 8.dp, vertical = 2.dp)
    ) {
        Text(type ?: "-", style = MaterialTheme.typography.bodySmall, color = textColor)
    }
}

/** Short date format: dd MMM yyyy - compatible with API 24. */
fun formatDateShort(dateStr: String): String {
    return try {
        val fmt = SimpleDateFormat("dd MMM yyyy", Locale("id"))
        val isoFmt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale("id"))
        val date = isoFmt.parse(dateStr.replace("Z", ""))!!
        fmt.format(date)
    } catch (e: Exception) {
        dateStr.take(10)
    }
}

/** Full date format: dd MMMM yyyy HH:mm - compatible with API 24. */
fun formatDateFull(dateStr: String): String {
    return try {
        val fmt = SimpleDateFormat("dd MMMM yyyy HH:mm", Locale("id"))
        val isoFmt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale("id"))
        val date = isoFmt.parse(dateStr.replace("Z", ""))!!
        fmt.format(date)
    } catch (e: Exception) {
        dateStr
    }
}
