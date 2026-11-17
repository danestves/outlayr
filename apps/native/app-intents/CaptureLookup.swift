import Foundation
import Security

/// Mirrors `CaptureLookupSnapshot` in `src/lib/capture-lookup.ts`; the app
/// writes it only while signed in with smart fill on.
struct CaptureLookupSnapshot: Codable {
    struct Branch: Codable {
        let children: [String]
        let name: String
    }

    let aiConsent: Int
    let expense: [Branch]
    let groundedLookup: Bool
    let income: [Branch]
    let locale: String?
    let regionCode: String?
    let shareAnalytics: Bool
    let url: String
}

/// `EnrichmentResult` in `packages/backend/confect/lib/enrichmentResult.ts`.
struct CaptureAnswer: Codable {
    let categoryName: String?
    let domain: String?
    let emoji: String?
    let isNewCategory: Bool
    let merchantName: String?
    let parentCategoryName: String?
    let tags: [String]
}

/// The endpoint's reply, kept as is under `answerPrefix + captureId` for the drain.
struct CaptureOutcome: Codable {
    let answer: CaptureAnswer?
    let queued: Bool
}

private struct CaptureRequest: Encodable {
    let aiConsent: Int
    let captureId: String
    let categoryTree: [CaptureLookupSnapshot.Branch]
    let currency: String?
    let groundedLookup: Bool
    let income: Bool
    let locale: String?
    let name: String
    let regionCode: String?
    let shareAnalytics: Bool
}

enum CaptureLookup {
    /// Mirrored by `CAPTURE_SNAPSHOT_KEY` and `CAPTURE_ANSWER_PREFIX` in `src/lib/capture-lookup.ts`.
    static let snapshotKey = "captureLookup"
    static let answerPrefix = "captureAnswer."

    /// The Wallet trigger already waits on slow card providers; past this the
    /// app files the row bare and asks again itself.
    static let timeout: TimeInterval = 5

    private static let minimumName = 3
    private static let service = "com.tryoutlayr.capture"
    private static let account = "key"

    static func canAsk(_ name: String) -> Bool {
        name.count >= minimumName && SharedStore.store?.string(forKey: snapshotKey) != nil
    }

    /// `unavailable` is a keychain that is still locked since boot: neither
    /// present nor absent, so the app must not mint over it.
    static func keyStatus() -> String {
        switch readKey() {
        case .some(.some): return "present"
        case .some(.none): return "absent"
        case .none: return "unavailable"
        }
    }

    @discardableResult
    static func setKey(_ key: String?) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        SecItemDelete(query as CFDictionary)
        guard let key else { return true }
        var item = query
        item[kSecValueData as String] = Data(key.utf8)
        // A Wallet automation runs on a locked phone; never synced off the device.
        item[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        return SecItemAdd(item as CFDictionary, nil) == errSecSuccess
    }

    /// Nil when the keychain cannot answer, an inner nil when there is no key.
    private static func readKey() -> String?? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var result: AnyObject?
        switch SecItemCopyMatching(query as CFDictionary, &result) {
        case errSecSuccess:
            return .some((result as? Data).flatMap { String(data: $0, encoding: .utf8) })
        case errSecItemNotFound:
            return .some(nil)
        default:
            return nil
        }
    }

    /// Any failure returns nil and leaves no outcome, so the app looks the merchant up itself on open.
    static func ask(captureId: String, name: String, currency: String?, income: Bool) async -> CaptureOutcome? {
        guard let raw = SharedStore.store?.string(forKey: snapshotKey),
              let snapshot = try? JSONDecoder().decode(CaptureLookupSnapshot.self, from: Data(raw.utf8)),
              let url = URL(string: snapshot.url),
              case .some(.some(let key)) = readKey(),
              let body = try? JSONEncoder().encode(
                CaptureRequest(
                    aiConsent: snapshot.aiConsent,
                    captureId: captureId,
                    categoryTree: income ? snapshot.income : snapshot.expense,
                    currency: currency,
                    groundedLookup: snapshot.groundedLookup,
                    income: income,
                    locale: snapshot.locale,
                    name: name,
                    regionCode: snapshot.regionCode,
                    shareAnalytics: snapshot.shareAnalytics
                )
              ) else { return nil }
        var request = URLRequest(url: url, timeoutInterval: timeout)
        request.httpMethod = "POST"
        request.httpBody = body
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(key)", forHTTPHeaderField: "Authorization")
        guard let (data, response) = try? await URLSession.shared.data(for: request),
              let status = (response as? HTTPURLResponse)?.statusCode else { return nil }
        if status == 401 {
            // Revoked or its account deleted: the app mints a fresh one on its next open.
            setKey(nil)
            return nil
        }
        guard status == 200,
              let outcome = try? JSONDecoder().decode(CaptureOutcome.self, from: data),
              let stored = String(data: data, encoding: .utf8) else { return nil }
        SharedStore.store?.set(stored, forKey: answerPrefix + captureId)
        return outcome
    }
}
