package com.brontolano.albafintech.util

import android.content.ContentValues
import android.content.Context
import android.net.Uri
import android.provider.MediaStore
import android.text.format.DateFormat
import androidx.activity.result.ActivityResultCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.FileProvider
import java.io.File
import java.util.Date

/**
 * Utility for capturing photos using CameraX / system camera intent.
 * Saves the photo to a temporary file and returns the URI.
 */
object CameraCaptureUtil {

    /**
     * Creates a unique temporary file for storing a captured image.
     * Returns the File object.
     */
    fun createImageFile(context: Context): File {
        val timeStamp = DateFormat.format("yyyyMMdd_HHmmss", Date()).toString()
        val storageDir = context.cacheDir
        return File.createTempFile("IMG_${timeStamp}_", ".jpg", storageDir)
    }

    /**
     * Creates a content URI for the temporary file using FileProvider.
     */
    fun createImageUri(context: Context): Pair<File, Uri> {
        val file = createImageFile(context)
        val uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            file
        )
        return Pair(file, uri)
    }

    /**
     * Returns a launcher for taking pictures using the system camera.
     * Usage: Pass the returned callback to ActivityResultRegistry.
     */
    fun getTakePictureCallback(): ActivityResultCallback<Boolean> {
        return ActivityResultCallback { /* handled by caller */ }
    }
}

/**
 * Contract for taking a picture and receiving the resulting File.
 */
class TakePictureContract(
    private val context: Context
) : androidx.activity.result.contract.ActivityResultContract<Uri, Boolean>() {

    override fun createIntent(context: Context, input: Uri): android.content.Intent {
        return android.content.Intent(MediaStore.ACTION_IMAGE_CAPTURE).apply {
            putExtra(MediaStore.EXTRA_OUTPUT, input)
            addFlags(android.content.Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
        }
    }

    override fun getSynchronousResult(
        context: Context,
        input: Uri
    ): SynchronousResult<Boolean>? {
        return null
    }

    override fun parseResult(resultCode: Int, intent: android.content.Intent?): Boolean {
        return resultCode == android.app.Activity.RESULT_OK
    }
}
