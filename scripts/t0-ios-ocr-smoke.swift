import Foundation

@main
struct SimulatorOCRSmoke {
  static func main() throws {
    guard CommandLine.arguments.count == 2 else {
      throw NSError(domain: "T0", code: 1, userInfo: [NSLocalizedDescriptionKey: "Pass the host synthetic fixture directory"])
    }
    let source = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
    let documents = try FileManager.default.url(for: .documentDirectory, in: .userDomainMask,
                                                appropriateFor: nil, create: true)
    let expected = "Plants use sunlight to make food through photosynthesis."
    var results: [[String: Any]] = []
    for (kind, fixture) in [("image", "printed.png"), ("pdf", "printed.pdf")] {
      let name = "t0-\(UUID().uuidString)-\(fixture)"
      try FileManager.default.copyItem(at: source.appendingPathComponent(fixture),
                                      to: documents.appendingPathComponent(name))
      let start = ProcessInfo.processInfo.systemUptime
      let text = try kind == "image" ? LocalDocuments.imageText(name) : LocalDocuments.pdfText(name)
      let elapsedMs = (ProcessInfo.processInfo.systemUptime - start) * 1000
      guard text == expected else {
        throw NSError(domain: "T0", code: 2, userInfo: [NSLocalizedDescriptionKey: "Unexpected OCR: \(text)"])
      }
      results.append(["path": kind, "text": text, "elapsedMs": elapsedMs,
                      "memory": try LocalDocuments.memory(), "stagedPath": documents.appendingPathComponent(name).path])
    }
    let report: [String: Any] = ["scope": "iOS Simulator OCR core only; not Expo bridge or physical-device proof",
                                 "os": ProcessInfo.processInfo.operatingSystemVersionString, "results": results]
    let json = try JSONSerialization.data(withJSONObject: report, options: [.prettyPrinted, .sortedKeys])
    print(String(decoding: json, as: UTF8.self))
  }
}
