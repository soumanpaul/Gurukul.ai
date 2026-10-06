import ExpoModulesCore
import Foundation
import UIKit

public class DocumentReaderModule: Module {
  private let worker = DispatchQueue(label: "org.gurukul.t0.documents")

  public func definition() -> ModuleDefinition {
    Name("DocumentReader")

    Function("newId") { UUID().uuidString.lowercased() }

    AsyncFunction("inspectSource") { (name: String, kind: String) in
      try SourceDocuments.inspect(name, kind: kind)
    }.runOnQueue(worker)

    AsyncFunction("sourcePage") { (name: String, kind: String, page: Int) in
      try SourceDocuments.page(name, kind: kind, number: page)
    }.runOnQueue(worker)

    AsyncFunction("setDownloadAwake") { (active: Bool) in
      UIApplication.shared.isIdleTimerDisabled = active
    }.runOnQueue(.main)

    AsyncFunction("modelDirectory") {
      try LocalDocuments.modelDirectory().absoluteString
    }.runOnQueue(worker)

    AsyncFunction("promoteModel") { (partial: String, filename: String) in
      try LocalDocuments.promoteModel(partial, filename: filename)
    }.runOnQueue(worker)

    #if DEBUG || T0_OFFLINE_SMOKE
    Constant("t8Mode") {
      ["quality", "offline", "recovery", "benchmark"].first {
        ProcessInfo.processInfo.arguments.contains("--gurukul-t8-\($0)")
      } ?? ""
    }
    AsyncFunction("evaluationVitals") {
      UIDevice.current.isBatteryMonitoringEnabled = true
      return ["batteryLevel": UIDevice.current.batteryLevel,
              "batteryState": UIDevice.current.batteryState.rawValue,
              "thermalState": ProcessInfo.processInfo.thermalState.rawValue] as [String: Any]
    }.runOnQueue(.main)
    Constant("t7SmokeEnabled") {
      ProcessInfo.processInfo.arguments.contains("--gurukul-t7-smoke")
    }
    Constant("t5CandidateEnabled") {
      ProcessInfo.processInfo.arguments.contains("--gurukul-t5-candidate")
    }
    Constant("t5SmokeEnabled") {
      ProcessInfo.processInfo.arguments.contains("--gurukul-t5-smoke")
    }
    Constant("t4SmokeEnabled") {
      ProcessInfo.processInfo.arguments.contains("--gurukul-t4-smoke")
    }
    Constant("t3SmokeEnabled") {
      ProcessInfo.processInfo.arguments.contains("--gurukul-t3-smoke")
    }
    Constant("t2SmokeEnabled") {
      ProcessInfo.processInfo.arguments.contains("--gurukul-t2-smoke")
    }

    Constant("t2DownloadEnabled") {
      ProcessInfo.processInfo.arguments.contains("--gurukul-t2-download")
    }

    Constant("t0SmokeEnabled") {
      ProcessInfo.processInfo.arguments.contains("--gurukul-t0-smoke")
    }

    Constant("smokeDeviceKind") {
      #if targetEnvironment(simulator)
      return "simulator"
      #else
      return "physical"
      #endif
    }

    AsyncFunction("deviceInfo") {
      let directory = try FileManager.default.url(for: .documentDirectory, in: .userDomainMask,
                                                  appropriateFor: nil, create: true)
      let storage = try FileManager.default.attributesOfFileSystem(forPath: directory.path)
      return ["os": ProcessInfo.processInfo.operatingSystemVersionString,
              "embeddedBundlePresent": Bundle.main.url(forResource: "main", withExtension: "jsbundle") != nil,
              "ramBytes": ProcessInfo.processInfo.physicalMemory,
              "storageBytes": storage[.systemSize] ?? 0,
              "freeStorageBytes": storage[.systemFreeSize] ?? 0] as [String: Any]
    }.runOnQueue(worker)

    AsyncFunction("saveT0SmokeReport") { (report: String) in
      guard (ProcessInfo.processInfo.arguments.contains("--gurukul-t0-smoke") ||
             ProcessInfo.processInfo.arguments.contains("--gurukul-t2-smoke") ||
             ProcessInfo.processInfo.arguments.contains("--gurukul-t3-smoke") ||
             ProcessInfo.processInfo.arguments.contains("--gurukul-t4-smoke") ||
             ProcessInfo.processInfo.arguments.contains("--gurukul-t5-smoke")),
            report.utf8.count <= 50000 else {
        throw NSError(domain: "GurukulT0", code: 1, userInfo: [NSLocalizedDescriptionKey: "T0 smoke reporting is disabled or oversized"])
      }
      let directory = try FileManager.default.url(for: .documentDirectory, in: .userDomainMask,
                                                  appropriateFor: nil, create: true)
      let prefix = ProcessInfo.processInfo.arguments.contains("--gurukul-t5-smoke") ? "t5-smoke" :
        ProcessInfo.processInfo.arguments.contains("--gurukul-t4-smoke") ? "t4-smoke" :
        ProcessInfo.processInfo.arguments.contains("--gurukul-t3-smoke") ? "t3-smoke" :
        (ProcessInfo.processInfo.arguments.contains("--gurukul-t2-smoke") ? "t2-smoke" : "t0-smoke")
      let url = directory.appendingPathComponent("\(prefix)-\(UUID().uuidString).json")
      try Data(report.utf8).write(to: url, options: .withoutOverwriting)
      return url.path
    }.runOnQueue(worker)
    #endif

    AsyncFunction("verifyModel") { (name: String, bytes: Double, hash: String) in
      try LocalDocuments.verifyModel(name, bytes: bytes, hash: hash)
    }.runOnQueue(worker)

    AsyncFunction("imageText") { (name: String) in
      try LocalDocuments.imageText(name)
    }.runOnQueue(worker)

    AsyncFunction("pdfText") { (name: String) in
      try LocalDocuments.pdfText(name)
    }.runOnQueue(worker)

    AsyncFunction("memory") {
      try LocalDocuments.memory()
    }.runOnQueue(worker)
  }
}
