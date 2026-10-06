import AppKit
import CoreText
import Foundation
import ImageIO
import PDFKit
import Vision

let outputDirectory = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
    .appendingPathComponent(".local/t0")
try FileManager.default.createDirectory(at: outputDirectory, withIntermediateDirectories: true)
let expected = "Plants use sunlight to make food through photosynthesis."
let pageBounds = CGRect(x: 0, y: 0, width: 900, height: 300)

func drawFixture(_ context: CGContext) {
    context.setFillColor(CGColor(gray: 1, alpha: 1))
    context.fill(pageBounds)
    let font = CTFontCreateWithName("Helvetica" as CFString, 24, nil)
    let line = CTLineCreateWithAttributedString(NSAttributedString(
        string: expected,
        attributes: [NSAttributedString.Key(kCTFontAttributeName as String): font]
    ))
    context.textPosition = CGPoint(x: 30, y: 150)
    CTLineDraw(line, context)
}

func recognize(_ image: CGImage) throws -> (String, Double) {
    let start = ProcessInfo.processInfo.systemUptime
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.recognitionLanguages = ["en-US"]
    request.usesLanguageCorrection = false
    try VNImageRequestHandler(cgImage: image).perform([request])
    let text = (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }.joined(separator: " ")
    guard text == expected else { throw NSError(domain: "T0 OCR mismatch: \(text)", code: 1) }
    return (text, (ProcessInfo.processInfo.systemUptime - start) * 1000)
}

let bitmap = CGContext(data: nil, width: 900, height: 300, bitsPerComponent: 8,
                       bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(),
                       bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
drawFixture(bitmap)
let image = bitmap.makeImage()!
let pngURL = outputDirectory.appendingPathComponent("printed.png")
let pdfURL = outputDirectory.appendingPathComponent("printed.pdf")
guard !FileManager.default.fileExists(atPath: pngURL.path),
      !FileManager.default.fileExists(atPath: pdfURL.path) else {
    fatalError("Fixture files already exist; preserve them and use the recorded results")
}
let destination = CGImageDestinationCreateWithURL(pngURL as CFURL, "public.png" as CFString, 1, nil)!
CGImageDestinationAddImage(destination, image, nil)
guard CGImageDestinationFinalize(destination) else { fatalError("PNG write failed") }
var mediaBox = pageBounds
let pdfContext = CGContext(pdfURL as CFURL, mediaBox: &mediaBox, nil)!
pdfContext.beginPDFPage(nil)
pdfContext.draw(image, in: pageBounds)
pdfContext.endPDFPage()
pdfContext.closePDF()

let imageResult = try recognize(CGImageSourceCreateImageAtIndex(
    CGImageSourceCreateWithURL(pngURL as CFURL, nil)!, 0, nil)!)
let pdfStart = ProcessInfo.processInfo.systemUptime
let document = PDFDocument(url: pdfURL)!
guard document.pageCount == 1, let page = document.page(at: 0),
      (page.string ?? "").trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
    fatalError("Expected a scanned one-page PDF without a text layer")
}
let rendered = CGContext(data: nil, width: 1800, height: 600, bitsPerComponent: 8,
                         bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(),
                         bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
rendered.setFillColor(CGColor(gray: 1, alpha: 1))
rendered.fill(CGRect(x: 0, y: 0, width: 1800, height: 600))
rendered.scaleBy(x: 2, y: 2)
page.draw(with: .mediaBox, to: rendered)
let pdfResult = try recognize(rendered.makeImage()!)
let evidence: [String: Any] = [
    "scope": "macOS host only; Apple Vision/PDFKit, not Android ML Kit/PdfRenderer evidence",
    "os": ProcessInfo.processInfo.operatingSystemVersionString,
    "printedImage": ["text": imageResult.0, "ocrMs": imageResult.1],
    "scannedPdf": ["pages": 1, "textLayer": false, "text": pdfResult.0,
                   "ocrMs": pdfResult.1,
                   "renderAndOcrMs": (ProcessInfo.processInfo.systemUptime - pdfStart) * 1000]
]
let data = try JSONSerialization.data(withJSONObject: evidence, options: [.prettyPrinted, .sortedKeys])
try data.write(to: outputDirectory.appendingPathComponent("host-ingestion.json"), options: .withoutOverwriting)
print(String(data: data, encoding: .utf8)!)
