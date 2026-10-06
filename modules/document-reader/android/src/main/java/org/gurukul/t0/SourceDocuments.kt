package org.gurukul.t0

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.pdf.PdfRenderer
import android.media.ExifInterface
import android.os.ParcelFileDescriptor
import java.io.File
import java.nio.ByteBuffer
import java.nio.charset.CodingErrorAction
import java.security.MessageDigest

class SourceDocuments(private val directory: File, private val recognize: (Bitmap) -> String) {
  private fun file(name: String): File {
    require(name.matches(Regex("[A-Za-z0-9_.-]+")) && !name.contains("..")) { "IMPORT_FORMAT" }
    return File(directory, name).also {
      require(it.isFile && it.canonicalFile == it.absoluteFile) { "IMPORT_MISSING" }
      require(it.length() in 1..20L * 1024 * 1024) { "IMPORT_LIMIT" }
    }
  }

  private fun text(source: File): String {
    require(source.length() <= 1024 * 1024) { "IMPORT_LIMIT" }
    val decoder = Charsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT).onUnmappableCharacter(CodingErrorAction.REPORT)
    return decoder.decode(ByteBuffer.wrap(source.readBytes())).toString().removePrefix("\uFEFF").also {
      require(!it.contains('\u0000') && it.length <= 20000) { "IMPORT_FORMAT" }
    }
  }

  private fun bounds(source: File) {
    val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeFile(source.path, options)
    require(options.outWidth in 1..4096 && options.outHeight in 1..4096) { "IMPORT_LIMIT" }
  }

  fun inspect(name: String, kind: String): Map<String, Any> {
    val source = file(name)
    val header = ByteArray(8)
    source.inputStream().use { it.read(header) }
    val valid = when (kind) {
      "pdf" -> header.take(5).toByteArray().contentEquals("%PDF-".toByteArray())
      "png" -> header.contentEquals(byteArrayOf(137.toByte(),80,78,71,13,10,26,10))
      "jpg" -> header.size >= 3 && header[0] == 255.toByte() && header[1] == 216.toByte() && header[2] == 255.toByte()
      "txt" -> true
      else -> false
    }
    require(valid) { "IMPORT_FORMAT" }
    var pages = 1
    when (kind) {
      "pdf" -> ParcelFileDescriptor.open(source, ParcelFileDescriptor.MODE_READ_ONLY).use { descriptor ->
        PdfRenderer(descriptor).use { renderer ->
          require(renderer.pageCount in 1..10) { "IMPORT_LIMIT" }
          pages = renderer.pageCount
          for (index in 0 until pages) renderer.openPage(index).use { page ->
            require(page.width in 1..2048 && page.height in 1..2048) { "IMPORT_LIMIT" }
          }
        }
      }
      "txt" -> text(source)
      else -> bounds(source)
    }
    val digest = MessageDigest.getInstance("SHA-256")
    source.inputStream().buffered().use { stream ->
      val buffer = ByteArray(1024 * 1024)
      var count = stream.read(buffer)
      while (count != -1) { digest.update(buffer, 0, count); count = stream.read(buffer) }
    }
    return mapOf("sha256" to digest.digest().joinToString("") { "%02x".format(it) }, "bytes" to source.length(), "pages" to pages)
  }

  private fun preview(bitmap: Bitmap, source: File, page: Int): String {
    val destination = File(directory, source.name + "-p$page.jpg")
    if (!destination.exists()) destination.outputStream().use { stream ->
      require(bitmap.compress(Bitmap.CompressFormat.JPEG, 80, stream)) { "IMPORT_STORAGE" }
    }
    return destination.name
  }

  fun page(name: String, kind: String, number: Int): Map<String, Any?> {
    val source = file(name)
    require(number in 1..10) { "IMPORT_LIMIT" }
    if (kind == "txt") {
      require(number == 1) { "IMPORT_LIMIT" }
      return mapOf("text" to text(source), "method" to "text", "preview" to null)
    }
    if (kind == "pdf") {
      ParcelFileDescriptor.open(source, ParcelFileDescriptor.MODE_READ_ONLY).use { descriptor ->
        PdfRenderer(descriptor).use { renderer ->
          require(renderer.pageCount in 1..10 && number <= renderer.pageCount) { "IMPORT_LIMIT" }
          renderer.openPage(number - 1).use { page ->
            require(page.width in 1..2048 && page.height in 1..2048) { "IMPORT_LIMIT" }
            val bitmap = Bitmap.createBitmap(page.width * 2, page.height * 2, Bitmap.Config.ARGB_8888)
            try {
              bitmap.eraseColor(Color.WHITE)
              page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
              val thumbnail = preview(bitmap, source, number)
              return mapOf("text" to recognize(bitmap), "method" to "pdf-ocr", "preview" to thumbnail)
            } finally { if (!bitmap.isRecycled) bitmap.recycle() }
          }
        }
      }
    }
    require(number == 1 && (kind == "jpg" || kind == "png")) { "IMPORT_FORMAT" }
    bounds(source)
    var bitmap = requireNotNull(BitmapFactory.decodeFile(source.path)) { "IMPORT_FORMAT" }
    try {
      val orientation = if (kind == "jpg") ExifInterface(source.path).getAttributeInt(ExifInterface.TAG_ORIENTATION, 1) else 1
      val transform = Matrix()
      when (orientation) {
        2 -> transform.setScale(-1f, 1f)
        3 -> transform.setRotate(180f)
        4 -> transform.setScale(1f, -1f)
        5 -> { transform.setRotate(90f); transform.postScale(-1f, 1f) }
        6 -> transform.setRotate(90f)
        7 -> { transform.setRotate(-90f); transform.postScale(-1f, 1f) }
        8 -> transform.setRotate(-90f)
      }
      if (!transform.isIdentity) {
        val rotated = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, transform, true)
        if (rotated !== bitmap) bitmap.recycle()
        bitmap = rotated
      }
      val thumbnail = preview(bitmap, source, number)
      return mapOf("text" to recognize(bitmap), "method" to "image-ocr", "preview" to thumbnail)
    } finally { if (!bitmap.isRecycled) bitmap.recycle() }
  }
}
