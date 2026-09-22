import ExpoModulesCore
import UIKit

#if canImport(DeclaredAgeRange)
import DeclaredAgeRange
#endif

public class DeclaredAgeRangeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("DeclaredAgeRange")

    AsyncFunction("requestAdult") { (promise: Promise) in
      #if canImport(DeclaredAgeRange)
      if #available(iOS 26.0, *) {
        Task { @MainActor in
          guard let controller = Self.topController() else {
            promise.resolve(["status": "unavailable"])
            return
          }
          do {
            let response = try await AgeRangeService.shared.requestAgeRange(ageGates: 18, in: controller)
            switch response {
            case .declinedSharing:
              promise.resolve(["status": "declined"])
            case .sharing(let range):
              if let upper = range.upperBound, upper < 18 {
                promise.resolve(["status": "under"])
              } else if let lower = range.lowerBound, lower >= 18 {
                promise.resolve(["status": "adult"])
              } else {
                promise.resolve(["status": "unknown"])
              }
            @unknown default:
              promise.resolve(["status": "unavailable"])
            }
          } catch {
            promise.resolve(["status": "unavailable"])
          }
        }
        return
      }
      #endif
      promise.resolve(["status": "unavailable"])
    }
  }

  @MainActor
  private static func topController() -> UIViewController? {
    let scene = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .first { $0.activationState == .foregroundActive }
    let root = scene?.windows.first { $0.isKeyWindow }?.rootViewController
    var current = root
    while let presented = current?.presentedViewController {
      current = presented
    }
    return current
  }
}
