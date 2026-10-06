import Foundation
import CryptoKit
import ImageIO
import PDFKit
import Vision
import Darwin

enum LocalDocuments {
  static func modelDirectory() throws -> URL {
    var directory = try FileManager.default.url(for: .documentDirectory, in: .userDomainMask,
                                                appropriateFor: nil, create: true)
    var values = URLResourceValues()
    values.isExcludedFromBackup = true
    try directory.setResourceValues(values)
    return directory
  }

  static func promoteModel(_ partial: String, filename: String) throws {
    guard partial.hasPrefix("download-"), partial.hasSuffix(".partial"),
          filename.range(of: "^model-[a-f0-9]{64}-[A-Za-z0-9-]+\\.gguf$", options: .regularExpression) != nil else {
      throw failure("Invalid installation filename")
    }
    let source = try file(partial)
    var destination = try modelDirectory().appendingPathComponent(filename)
    guard !FileManager.default.fileExists(atPath: destination.path) else { throw failure("Existing model kept") }
    try FileManager.default.moveItem(at: source, to: destination)
    var values = URLResourceValues()
    values.isExcludedFromBackup = true
    try destination.setResourceValues(values)
  }

  private static func failure(_ message: String) -> NSError {
    NSError(domain: "GurukulDocumentReader", code: 1, userInfo: [NSLocalizedDescriptionKey: message])
  }

  static func file(_ name: String, limit: Int64? = nil) throws -> URL {
    guard name.range(of: "^[A-Za-z0-9_.-]+$", options: .regularExpression) != nil,
          !name.contains("..") else { throw failure("Invalid fixture name") }
    let directory = try FileManager.default.url(for: .documentDirectory, in: .userDomainMask,
                                                appropriateFor: nil, create: false)
    let url = directory.appendingPathComponent(name)
    let values = try url.resourceValues(forKeys: [.isRegularFileKey, .isSymbolicLinkKey, .fileSizeKey])
    guard values.isRegularFile == true, values.isSymbolicLink != true,
          let size = values.fileSize, size > 0 else { throw failure("Missing or invalid staged file") }
    if let limit, Int64(size) > limit { throw failure("Fixture exceeds size limit") }
    return url
  }

  static func verifyModel(_ name: String, bytes: Double, hash: String) throws -> String {
    let url = try file(name)
    let size = try url.resourceValues(forKeys: [.fileSizeKey]).fileSize
    guard let size, Double(size) == bytes else { throw failure("Model byte count mismatch") }
    let handle = try FileHandle(forReadingFrom: url)
    defer { try? handle.close() }
    var digest = SHA256()
    while let chunk = try handle.read(upToCount: 1024 * 1024), !chunk.isEmpty {
      digest.update(data: chunk)
    }
    let actual = digest.finalize().map { String(format: "%02x", $0) }.joined()
    guard actual == hash else { throw failure("Model SHA-256 mismatch") }
    return url.path
  }

  static func recognize(_ image: CGImage, orientation: CGImagePropertyOrientation = .up, allowEmpty: Bool = false) throws -> String {
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.recognitionLanguages = ["en-US"]
    request.usesLanguageCorrection = true
    try VNImageRequestHandler(cgImage: image, orientation: orientation).perform([request])
    let text = (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }.joined(separator: "\n")
    guard (allowEmpty || !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty),
          text.count <= 20000 else { throw failure("Empty or oversized OCR result") }
    return text
  }

  static func imageText(_ name: String) throws -> String {
    let url = try file(name, limit: 20 * 1024 * 1024)
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
          let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
          let width = properties[kCGImagePropertyPixelWidth] as? Int,
          let height = properties[kCGImagePropertyPixelHeight] as? Int,
          (1...4096).contains(width), (1...4096).contains(height),
          let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
      throw failure("Invalid image or dimensions exceed 4096")
    }
    let orientation = CGImagePropertyOrientation(rawValue: (properties[kCGImagePropertyOrientation] as? UInt32) ?? 1) ?? .up
    return try recognize(image, orientation: orientation)
  }

  static func pdfText(_ name: String) throws -> String {
    let url = try file(name, limit: 20 * 1024 * 1024)
    guard let document = PDFDocument(url: url), !document.isLocked,
          document.pageCount == 1, let page = document.page(at: 0) else {
      throw failure("T0 requires one unlocked PDF page")
    }
    let bounds = page.bounds(for: .mediaBox)
    guard bounds.width.isFinite, bounds.height.isFinite,
          bounds.width >= 1, bounds.height >= 1,
          bounds.width <= 2048, bounds.height <= 2048 else { throw failure("Invalid PDF dimensions") }
    let width = Int(ceil(bounds.width * 2))
    let height = Int(ceil(bounds.height * 2))
    guard let context = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8,
                                  bytesPerRow: width * 4, space: CGColorSpaceCreateDeviceRGB(),
                                  bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else {
      throw failure("PDF bitmap allocation failed")
    }
    context.setFillColor(CGColor(gray: 1, alpha: 1))
    context.fill(CGRect(x: 0, y: 0, width: width, height: height))
    context.scaleBy(x: 2, y: 2)
    context.translateBy(x: -bounds.minX, y: -bounds.minY)
    page.draw(with: .mediaBox, to: context)
    guard let image = context.makeImage() else { throw failure("PDF rendering failed") }
    return try recognize(image)
  }

  static func memory() throws -> [String: Double] {
    var info = mach_task_basic_info()
    var count = mach_msg_type_number_t(MemoryLayout<mach_task_basic_info>.size / MemoryLayout<natural_t>.size)
    let status = withUnsafeMutablePointer(to: &info) { pointer in
      pointer.withMemoryRebound(to: integer_t.self, capacity: Int(count)) { rebound in
        task_info(mach_task_self_, task_flavor_t(MACH_TASK_BASIC_INFO), rebound, &count)
      }
    }
    guard status == KERN_SUCCESS else { throw failure("Process memory unavailable") }
    return ["residentBytes": Double(info.resident_size)]
  }
}
