import Foundation
import CryptoKit
import ImageIO
import PDFKit

enum SourceDocuments {
  private static func fail(_ code: String) -> NSError {
    NSError(domain: "GurukulImport", code: 1, userInfo: [NSLocalizedDescriptionKey: "IMPORT_\(code)"])
  }

  static func inspect(_ name: String, kind: String) throws -> [String: Any] {
    let url = try LocalDocuments.file(name, limit: 20 * 1024 * 1024)
    let size = try url.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
    let handle = try FileHandle(forReadingFrom: url)
    defer { try? handle.close() }
    let header = try handle.read(upToCount: 8) ?? Data()
    let signature: Bool
    switch kind {
    case "pdf": signature = header.starts(with: Data("%PDF-".utf8))
    case "png": signature = header.starts(with: [137,80,78,71,13,10,26,10])
    case "jpg": signature = header.starts(with: [255,216,255])
    case "txt": signature = size <= 1024 * 1024
    default: signature = false
    }
    guard signature else { throw fail("FORMAT") }
    var pageCount = 1
    if kind == "pdf" {
      let document = try pdf(url)
      pageCount = document.pageCount
      for index in 0..<pageCount {
        guard let page = document.page(at: index) else { throw fail("FORMAT") }
        try validateBounds(page.bounds(for: .mediaBox))
      }
    } else if kind == "txt" {
      _ = try text(url)
    } else {
      _ = try image(url)
    }
    try handle.seek(toOffset: 0)
    var digest = SHA256()
    while let chunk = try handle.read(upToCount: 1024 * 1024), !chunk.isEmpty { digest.update(data: chunk) }
    var backupURL = url
    var values = URLResourceValues()
    values.isExcludedFromBackup = true
    try backupURL.setResourceValues(values)
    return ["sha256": digest.finalize().map { String(format: "%02x", $0) }.joined(), "bytes": size, "pages": pageCount]
  }

  private static func text(_ url: URL) throws -> String {
    guard let value = String(data: try Data(contentsOf: url), encoding: .utf8),
          !value.contains("\0"), value.utf16.count <= 20000 else { throw fail("FORMAT") }
    return value.replacingOccurrences(of: "\u{FEFF}", with: "")
  }

  private static func pdf(_ url: URL) throws -> PDFDocument {
    guard let document = PDFDocument(url: url), !document.isLocked, !document.isEncrypted else { throw fail("FORMAT") }
    guard (1...10).contains(document.pageCount) else { throw fail("LIMIT") }
    return document
  }

  private static func validateBounds(_ bounds: CGRect) throws {
    guard bounds.width.isFinite, bounds.height.isFinite, (1...2048).contains(bounds.width),
          (1...2048).contains(bounds.height) else { throw fail("LIMIT") }
  }

  private static func image(_ url: URL) throws -> CGImageSource {
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil), CGImageSourceGetCount(source) == 1,
          let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
          let width = properties[kCGImagePropertyPixelWidth] as? Int,
          let height = properties[kCGImagePropertyPixelHeight] as? Int else { throw fail("FORMAT") }
    guard (1...4096).contains(width), (1...4096).contains(height) else { throw fail("LIMIT") }
    return source
  }

  private static func preview(_ image: CGImage, source: URL, page: Int) throws -> String {
    let name = source.lastPathComponent + "-p\(page).jpg"
    var destination = source.deletingLastPathComponent().appendingPathComponent(name)
    if !FileManager.default.fileExists(atPath: destination.path) {
      guard let writer = CGImageDestinationCreateWithURL(destination as CFURL, "public.jpeg" as CFString, 1, nil) else { throw fail("STORAGE") }
      CGImageDestinationAddImage(writer, image, [kCGImageDestinationLossyCompressionQuality: 0.8] as CFDictionary)
      guard CGImageDestinationFinalize(writer) else { throw fail("STORAGE") }
      var values = URLResourceValues()
      values.isExcludedFromBackup = true
      try destination.setResourceValues(values)
    }
    return name
  }

  static func page(_ name: String, kind: String, number: Int) throws -> [String: Any] {
    let url = try LocalDocuments.file(name, limit: 20 * 1024 * 1024)
    guard (1...10).contains(number) else { throw fail("LIMIT") }
    if kind == "txt" {
      guard number == 1 else { throw fail("LIMIT") }
      return ["text": try text(url), "method": "text", "preview": NSNull()]
    }
    if kind != "pdf" {
      guard number == 1, kind == "jpg" || kind == "png" else { throw fail("FORMAT") }
      let source = try image(url)
      guard let fullImage = CGImageSourceCreateImageAtIndex(source, 0, nil),
            let thumbnail = CGImageSourceCreateThumbnailAtIndex(source, 0, [kCGImageSourceCreateThumbnailFromImageAlways: true,
              kCGImageSourceCreateThumbnailWithTransform: true, kCGImageSourceThumbnailMaxPixelSize: 1600] as CFDictionary) else { throw fail("FORMAT") }
      let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any]
      let orientation = CGImagePropertyOrientation(rawValue: (properties?[kCGImagePropertyOrientation] as? UInt32) ?? 1) ?? .up
      let extracted = try LocalDocuments.recognize(fullImage, orientation: orientation, allowEmpty: true)
      return ["text": extracted, "method": "image-ocr", "preview": try preview(thumbnail, source: url, page: number)]
    }
    let document = try pdf(url)
    guard let page = document.page(at: number - 1) else { throw fail("LIMIT") }
    let bounds = page.bounds(for: .mediaBox)
    try validateBounds(bounds)
    let width = Int(ceil(bounds.width * 2))
    let height = Int(ceil(bounds.height * 2))
    guard let context = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: width * 4,
      space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { throw fail("LIMIT") }
    context.setFillColor(CGColor(gray: 1, alpha: 1))
    context.fill(CGRect(x: 0, y: 0, width: width, height: height))
    context.scaleBy(x: 2, y: 2)
    context.translateBy(x: -bounds.minX, y: -bounds.minY)
    page.draw(with: .mediaBox, to: context)
    guard let bitmap = context.makeImage() else { throw fail("FORMAT") }
    let embedded = page.string?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    guard embedded.utf16.count <= 20000 else { throw fail("LIMIT") }
    let extracted = embedded.isEmpty ? try LocalDocuments.recognize(bitmap, allowEmpty: true) : embedded
    return ["text": extracted, "method": embedded.isEmpty ? "pdf-ocr" : "pdf-text", "preview": try preview(bitmap, source: url, page: number)]
  }
}
