import CryptoKit
import Foundation
import UserNotifications

struct CaptureAnswer: Decodable {
    let categoryName: String?
    let merchantName: String?
}

struct CapturePush: Decodable {
    let answer: CaptureAnswer
    let id: String
    let name: String
}

final class NotificationService: UNNotificationServiceExtension {
    private static let store = UserDefaults(suiteName: "group.com.tryoutlayr.app")
    private static let secretKey = "capturePushSecret"

    private let lock = NSLock()
    private var contentHandler: ((UNNotificationContent) -> Void)?
    private var original: UNNotificationContent?

    override func didReceive(
        _ request: UNNotificationRequest,
        withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        self.contentHandler = contentHandler
        original = request.content
        guard let push = Self.open(request.content.userInfo),
              let content = request.content.mutableCopy() as? UNMutableNotificationContent
        else {
            deliver(request.content)
            return
        }
        let center = UNUserNotificationCenter.current()
        center.getDeliveredNotifications { delivered in
            let posted = delivered.first { $0.request.identifier == push.id }?.request.content.userInfo
            Self.rename(content, push: push, posted: posted)
            guard let handler = self.takeHandler() else { return }
            center.removeDeliveredNotifications(withIdentifiers: [push.id])
            handler(content)
        }
    }

    override func serviceExtensionTimeWillExpire() {
        if let original {
            deliver(original)
        }
    }

    private func deliver(_ content: UNNotificationContent) {
        takeHandler()?(content)
    }

    // The lookup callback and expiry run on different threads; only the first one delivers.
    private func takeHandler() -> ((UNNotificationContent) -> Void)? {
        lock.lock()
        defer { lock.unlock() }
        let handler = contentHandler
        contentHandler = nil
        return handler
    }

    static func rename(_ content: UNMutableNotificationContent, push: CapturePush, posted: [AnyHashable: Any]?) {
        let shown = push.answer.merchantName ?? push.name
        content.userInfo["capture"] = nil
        guard let posted, let amount = posted["amount"] as? String, let walletWrite = posted["walletWrite"] as? String else {
            content.title = shown
            content.body = push.answer.categoryName ?? ""
            return
        }
        content.title = shown.isEmpty ? amount : "\(amount) · \(shown)"
        content.body = [push.answer.categoryName, posted["cardLabel"] as? String].compactMap { $0 }.joined(separator: " · ")
        content.categoryIdentifier = "detected-charge"
        var tap: [String: Any] = ["walletWrite": walletWrite, "pickCard": posted["pickCard"] as? Bool ?? false]
        if let card = posted["card"] as? String {
            tap["card"] = card
        }
        // expo-notifications hands a remote notification's `body` to the tap handler as its data.
        content.userInfo["body"] = tap
    }

    static func open(_ userInfo: [AnyHashable: Any]) -> CapturePush? {
        guard let sealed = (userInfo["capture"] as? String).flatMap({ Data(base64Encoded: $0) }),
              let secret = store?.string(forKey: secretKey).flatMap(bytes(hex:)),
              let box = try? AES.GCM.SealedBox(combined: sealed),
              let plain = try? AES.GCM.open(box, using: SymmetricKey(data: secret))
        else { return nil }
        return try? JSONDecoder().decode(CapturePush.self, from: plain)
    }

    private static func bytes(hex: String) -> Data? {
        guard hex.count % 2 == 0 else { return nil }
        var data = Data(capacity: hex.count / 2)
        var index = hex.startIndex
        while index < hex.endIndex {
            let next = hex.index(index, offsetBy: 2)
            guard let byte = UInt8(hex[index ..< next], radix: 16) else { return nil }
            data.append(byte)
            index = next
        }
        return data
    }
}
