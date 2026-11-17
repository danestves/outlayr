import CryptoKit
import Foundation
import UserNotifications

// Copies of the records in app-intents/CaptureLookup.swift: an extension can't compile the app's sources.
struct CaptureAnswer: Codable {
    let categoryName: String?
    let domain: String?
    let emoji: String?
    let isNewCategory: Bool
    let merchantName: String?
    let parentCategoryName: String?
    let tags: [String]
}

struct CaptureNotice: Codable {
    let amount: String
    let card: String?
    let cardLabel: String?
    let pickCard: Bool
    let walletWrite: String
}

struct CaptureRecord: Codable {
    var answer: CaptureAnswer?
    var queued: Bool
    let name: String
    let notice: CaptureNotice?
}

struct CapturePush: Codable {
    let answer: CaptureAnswer
    let id: String
    let name: String
}

final class NotificationService: UNNotificationServiceExtension {
    private static let store = UserDefaults(suiteName: "group.com.tryoutlayr.app")
    private static let recordPrefix = "captureAnswer."
    private static let secretKey = "capturePushSecret"

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
            contentHandler(request.content)
            return
        }
        let record = Self.settle(push)
        let shown = push.answer.merchantName ?? push.name
        if let notice = record?.notice {
            content.title = shown.isEmpty ? notice.amount : "\(notice.amount) · \(shown)"
            content.body = [push.answer.categoryName, notice.cardLabel].compactMap { $0 }.joined(separator: " · ")
            var tap: [String: Any] = ["walletWrite": notice.walletWrite, "pickCard": notice.pickCard]
            if let card = notice.card {
                tap["card"] = card
            }
            // expo-notifications hands a remote notification's `body` to the tap handler as its data.
            content.userInfo["body"] = tap
        } else {
            content.title = shown
            content.body = push.answer.categoryName ?? ""
        }
        content.userInfo["capture"] = nil
        UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: [push.id])
        contentHandler(content)
    }

    override func serviceExtensionTimeWillExpire() {
        if let contentHandler, let original {
            contentHandler(original)
        }
    }

    private static func open(_ userInfo: [AnyHashable: Any]) -> CapturePush? {
        guard let sealed = (userInfo["capture"] as? String).flatMap({ Data(base64Encoded: $0) }),
              let secret = store?.string(forKey: secretKey).flatMap(bytes(hex:)),
              let box = try? AES.GCM.SealedBox(combined: sealed),
              let plain = try? AES.GCM.open(box, using: SymmetricKey(data: secret))
        else { return nil }
        return try? JSONDecoder().decode(CapturePush.self, from: plain)
    }

    private static func settle(_ push: CapturePush) -> CaptureRecord? {
        let key = recordPrefix + push.id
        guard let raw = store?.string(forKey: key),
              var record = try? JSONDecoder().decode(CaptureRecord.self, from: Data(raw.utf8))
        else { return nil }
        record.answer = push.answer
        record.queued = false
        if let data = try? JSONEncoder().encode(record) {
            store?.set(String(decoding: data, as: UTF8.self), forKey: key)
        }
        return record
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
