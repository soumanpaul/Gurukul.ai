import AppKit
import CoreText
import ImageIO
import PDFKit

let directory = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
let bounds = CGRect(x: 0, y: 0, width: 1200, height: 450)
guard let context = CGContext(data: nil, width: 1200, height: 450, bitsPerComponent: 8,
  bytesPerRow: 4800, space: CGColorSpaceCreateDeviceRGB(),
  bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { fatalError("bitmap") }
context.setFillColor(CGColor(gray: 1, alpha: 1))
context.fill(bounds)
let sentences = ["Roots absorb water from soil.", "Leaves contain chlorophyll.", "Seeds grow into new plants."]
for (index, sentence) in sentences.enumerated() {
  let font = CTFontCreateWithName("Helvetica" as CFString, 32, nil)
  let attributed = NSAttributedString(string: sentence,
    attributes: [NSAttributedString.Key(kCTFontAttributeName as String): font])
  context.textPosition = CGPoint(x: 40, y: 340 - index * 90)
  CTLineDraw(CTLineCreateWithAttributedString(attributed), context)
}
let png = directory.appendingPathComponent("t8-fresh.png")
let pdf = directory.appendingPathComponent("t8-fresh.pdf")
guard !FileManager.default.fileExists(atPath: png.path), !FileManager.default.fileExists(atPath: pdf.path),
  let image = context.makeImage(),
  let writer = CGImageDestinationCreateWithURL(png as CFURL, "public.png" as CFString, 1, nil)
  else { fatalError("existing fixture or image creation failed") }
CGImageDestinationAddImage(writer, image, nil)
guard CGImageDestinationFinalize(writer) else { fatalError("PNG write") }
var mediaBox = bounds
guard let document = CGContext(pdf as CFURL, mediaBox: &mediaBox, nil) else { fatalError("PDF write") }
document.beginPDFPage(nil)
document.draw(image, in: bounds)
document.endPDFPage()
document.closePDF()
guard PDFDocument(url: pdf)?.string?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty != false
  else { fatalError("Scanned PDF must not have embedded text") }
print("Synthetic printed English PNG and image-only PDF created.")
