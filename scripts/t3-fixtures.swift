import AppKit
import PDFKit
import CoreText

let directory = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
let sentence = "Plants use sunlight to make food through photosynthesis."
try Data("Water travels through stems.".utf8).write(to: directory.appendingPathComponent("t3-notes.txt"), options: .withoutOverwriting)

func drawText(_ value: String, context: CGContext, at point: CGPoint, size: CGFloat = 24) {
  let font = CTFontCreateWithName("Helvetica" as CFString, size, nil)
  let attributed = NSAttributedString(string: value, attributes: [NSAttributedString.Key(kCTFontAttributeName as String): font])
  context.textPosition = point
  CTLineDraw(CTLineCreateWithAttributedString(attributed), context)
}

func bitmap(_ filename: String, width: Int, height: Int, printed: Bool, type: CFString) throws {
  guard let context = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: width * 4,
    space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { fatalError("bitmap") }
  context.setFillColor(CGColor(gray: 1, alpha: 1)); context.fill(CGRect(x: 0, y: 0, width: width, height: height))
  if printed { drawText(sentence, context: context, at: CGPoint(x: 35, y: 170), size: 30) }
  let destination = directory.appendingPathComponent(filename)
  guard !FileManager.default.fileExists(atPath: destination.path), let image = context.makeImage(),
    let writer = CGImageDestinationCreateWithURL(destination as CFURL, type, 1, nil) else { fatalError("existing fixture") }
  CGImageDestinationAddImage(writer, image, nil)
  guard CGImageDestinationFinalize(writer) else { fatalError("write") }
}

func pdf(_ filename: String, pages: Int) throws {
  let destination = directory.appendingPathComponent(filename)
  guard !FileManager.default.fileExists(atPath: destination.path) else { fatalError("existing fixture") }
  var box = CGRect(x: 0, y: 0, width: 900, height: 500)
  guard let context = CGContext(destination as CFURL, mediaBox: &box, nil) else { fatalError("pdf") }
  for number in 1...pages {
    context.beginPDFPage(nil)
    drawText(number == 1 ? sentence : "Leaves contain chlorophyll and absorb light.", context: context, at: CGPoint(x: 35, y: 340))
    context.endPDFPage()
  }
  context.closePDF()
}

try bitmap("t3-printed.jpg", width: 1100, height: 350, printed: true, type: "public.jpeg" as CFString)
try bitmap("t3-blank.png", width: 400, height: 400, printed: false, type: "public.png" as CFString)
try bitmap("t3-oversized.png", width: 4097, height: 1, printed: false, type: "public.png" as CFString)
try pdf("t3-text.pdf", pages: 2)
try pdf("t3-too-many.pdf", pages: 11)
try Data(sentence.utf8).write(to: directory.appendingPathComponent("t3-not-pdf.pdf"), options: .withoutOverwriting)
let document = PDFDocument(url: directory.appendingPathComponent("t3-text.pdf"))!
let locked = directory.appendingPathComponent("t3-locked.pdf")
guard !FileManager.default.fileExists(atPath: locked.path), document.write(to: locked, withOptions: [.userPasswordOption: "fixture", .ownerPasswordOption: "fixture-owner"]) else { fatalError("locked PDF") }
print("Synthetic fixtures written to \(directory.path)")
