package org.gurukul.t0

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.os.Debug
import android.os.ParcelFileDescriptor
import android.view.WindowManager
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.security.MessageDigest
import java.util.UUID

class DocumentReaderModule : Module() {
  private fun localFile(name: String): File {
    require(name.matches(Regex("[A-Za-z0-9_.-]+")) && !name.contains(".."))
    val context = requireNotNull(appContext.reactContext)
    return File(context.filesDir, name).also {
      require(it.isFile && it.canonicalFile == it.absoluteFile) { "Missing or invalid staged file" }
    }
  }

  private fun recognize(bitmap: Bitmap, allowEmpty: Boolean = false): String {
    val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    try {
      return Tasks.await(recognizer.process(InputImage.fromBitmap(bitmap, 0))).text
        .also { require((allowEmpty || it.isNotBlank()) && it.length <= 20000) { "Empty or oversized OCR" } }
    } finally {
      recognizer.close()
      bitmap.recycle()
    }
  }

  override fun definition() = ModuleDefinition {
    Name("DocumentReader")

    Function("newId") { UUID.randomUUID().toString() }

    AsyncFunction("inspectSource") { name: String, kind: String ->
      SourceDocuments(requireNotNull(appContext.reactContext).filesDir) { recognize(it, true) }.inspect(name, kind)
    }

    AsyncFunction("sourcePage") { name: String, kind: String, page: Int ->
      SourceDocuments(requireNotNull(appContext.reactContext).filesDir) { recognize(it, true) }.page(name, kind, page)
    }

    AsyncFunction("setDownloadAwake") { active: Boolean ->
      val activity = appContext.currentActivity
      activity?.runOnUiThread {
        if (active) activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        else activity.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
      }
    }

    AsyncFunction("modelDirectory") {
      requireNotNull(appContext.reactContext).filesDir.toURI().toString()
    }

    AsyncFunction("promoteModel") { partial: String, filename: String ->
      require(partial.startsWith("download-") && partial.endsWith(".partial"))
      require(filename.matches(Regex("model-[a-f0-9]{64}-[A-Za-z0-9-]+\\.gguf")))
      val source = localFile(partial)
      val target = File(requireNotNull(appContext.reactContext).filesDir, filename)
      require(!target.exists()) { "Existing model kept" }
      require(source.renameTo(target)) { "Could not promote verified model" }
    }

    AsyncFunction("memory") {
      val info = Debug.MemoryInfo()
      Debug.getMemoryInfo(info)
      mapOf("pssKb" to info.totalPss, "nativeHeapBytes" to Debug.getNativeHeapAllocatedSize())
    }

    AsyncFunction("verifyModel") { name: String, bytes: Double, expectedHash: String ->
      val file = localFile(name)
      require(file.length().toDouble() == bytes) { "Model size mismatch" }
      val digest = MessageDigest.getInstance("SHA-256")
      file.inputStream().buffered().use { stream ->
        val buffer = ByteArray(1024 * 1024)
        var count = stream.read(buffer)
        while (count != -1) {
          digest.update(buffer, 0, count)
          count = stream.read(buffer)
        }
      }
      require(digest.digest().joinToString("") { "%02x".format(it) } == expectedHash) { "Model hash mismatch" }
      file.absolutePath
    }

    AsyncFunction("imageText") { name: String ->
      val file = localFile(name)
      require(file.length() <= 20 * 1024 * 1024) { "Image exceeds spike limit" }
      val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
      BitmapFactory.decodeFile(file.path, bounds)
      require(bounds.outWidth in 1..4096 && bounds.outHeight in 1..4096) { "Unsupported image bounds" }
      recognize(requireNotNull(BitmapFactory.decodeFile(file.path)))
    }

    AsyncFunction("pdfText") { name: String ->
      val file = localFile(name)
      require(file.length() <= 20 * 1024 * 1024) { "PDF exceeds spike limit" }
      ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY).use { descriptor ->
        PdfRenderer(descriptor).use { renderer ->
          require(renderer.pageCount == 1) { "T0 accepts one-page fixtures only" }
          renderer.openPage(0).use { page ->
            require(page.width in 1..2048 && page.height in 1..2048) { "Unsupported PDF bounds" }
            val bitmap = Bitmap.createBitmap(page.width * 2, page.height * 2, Bitmap.Config.ARGB_8888)
            try {
              bitmap.eraseColor(Color.WHITE)
              page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
              recognize(bitmap)
            } finally {
              if (!bitmap.isRecycled) bitmap.recycle()
            }
          }
        }
      }
    }
  }
}
