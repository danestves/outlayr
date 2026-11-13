import CryptoKit
import Foundation
import UserNotifications

/// The App Group the app shares with its widgets. Must match `APP_GROUP` in
/// `app.config.ts`; if the two ever disagree the container resolves to nil,
/// which is why `store` is failable rather than force-unwrapped.
enum SharedStore {
    static let appGroup = "group.com.tryoutlayr.app"

    /// Where the app leaves the figures the read-only intents report.
    static let snapshotKey = "intentSnapshot"

    /// Epoch milliseconds, as a string, of the last `SignalWalletRunIntent` run.
    /// Mirrored by `WALLET_LAST_RUN_KEY` in `src/lib/widget-bridge.ts`.
    static let walletRunKey = "walletLastRunAt"

    private static let missedTapPrefix = "outlayr.wallet-missed"

    static let missedTapDelay: TimeInterval = 2 * 60

    static let missedTapWindow: TimeInterval = 10 * 60

    /// Mirrored by `PUSHED_PURCHASES_KEY` in `src/lib/widget-bridge.ts`.
    static let pushedPurchasesKey = "pushedPurchases"

    static let walletPushKey = "walletPush"

    static let dailyReminderPrefix = "outlayr.daily-reminder"

    /// Where an intent leaves work for the app to commit, one JSON line per
    /// write. Mirrored by `QUEUE_DIRECTORY` / `QUEUE_FILE` in
    /// `src/lib/queue-file.ts`.
    static let queueDirectory = "pending-writes"
    static let queueFile = "queue.jsonl"

    static var store: UserDefaults? {
        UserDefaults(suiteName: appGroup)
    }

    /// The app writes this on every data change and on backgrounding, so nil
    /// means the app has not run since install rather than that the data is late.
    static func snapshot() -> IntentSnapshot? {
        decode(IntentSnapshot.self, forKey: snapshotKey)
    }

    static func walletPush() -> WalletPushSnapshot? {
        decode(WalletPushSnapshot.self, forKey: walletPushKey)
    }

    private static func decode<Value: Decodable>(_ type: Value.Type, forKey key: String) -> Value? {
        guard let raw = store?.string(forKey: key),
              let data = raw.data(using: .utf8) else {
            return nil
        }
        return try? JSONDecoder().decode(type, from: data)
    }

    /// Appends one line to a file rather than rewriting a queue held in a single
    /// `UserDefaults` string. Several intents can run while the app is closed,
    /// and read-append-write let two of them overwrite each other; an `O_APPEND`
    /// write reserves its own offset in the kernel, so nothing is read first and
    /// there is nothing to lose. The app never edits this file in place either —
    /// it renames it aside to drain it.
    static func enqueue(_ write: PendingWrite) async {
        guard let url = queueURL(),
              var line = try? JSONEncoder().encode(write) else { return }
        line.append(0x0A)
        append(line, to: url)
        let center = UNUserNotificationCenter.current()
        let reminders = await center.pendingNotificationRequests()
            .map(\.identifier)
            .filter { $0.hasPrefix(dailyReminderPrefix) }
        center.removePendingNotificationRequests(withIdentifiers: reminders)
    }

    /// Posts the app's own push from an intent, once per purchase key within
    /// `WALLET_DEDUPE_WINDOW_MS` (copied in `PushLedger`). Skipped, not
    /// thrown, when the app never got notification permission: the write is
    /// already queued and a failed run would make Shortcuts retry it.
    static func notify(
        title: String = "",
        body: String,
        userInfo: [AnyHashable: Any] = [:],
        purchase key: String,
        repeatsOnSettle: Bool = false
    ) async {
        let center = UNUserNotificationCenter.current()
        guard await center.notificationSettings().authorizationStatus == .authorized,
              await PushLedger.shared.claim(key, repeatsOnSettle: repeatsOnSettle) else { return }
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.userInfo = userInfo
        content.threadIdentifier = "automation"
        do {
            try await center.add(
                UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: nil)
            )
        } catch {
            await PushLedger.shared.release(key)
        }
    }

    static func lastWalletRun(within window: TimeInterval) -> Double? {
        let now = Date().timeIntervalSince1970 * 1000
        guard let at = store?.string(forKey: walletRunKey).flatMap(Double.init),
              now - at <= window * 1000 else { return nil }
        return at
    }

    static func armMissedTap(
        at: Double,
        merchant: String = "",
        card: String? = nil,
        after delay: TimeInterval?
    ) async {
        let center = UNUserNotificationCenter.current()
        guard await center.notificationSettings().authorizationStatus == .authorized else { return }
        let id = missedTapId(at)
        center.removePendingNotificationRequests(withIdentifiers: [id])
        let copy = walletPush()?.missedTap
        let content = UNMutableNotificationContent()
        content.title = copy?.title ?? "Apple Pay purchase not logged"
        content.body = copy?.body ?? "Apple didn't send the purchase details. Tap to log it if it went through."
        var userInfo: [AnyHashable: Any] = ["open": "create", "date": String(Int(at))]
        if !merchant.isEmpty {
            userInfo["note"] = merchant
        }
        if let card {
            userInfo["card"] = card
        }
        content.userInfo = userInfo
        content.threadIdentifier = "automation"
        let trigger = delay.map { UNTimeIntervalNotificationTrigger(timeInterval: $0, repeats: false) }
        try? await center.add(UNNotificationRequest(identifier: id, content: content, trigger: trigger))
    }

    static func disarmMissedTap(at: Double) {
        let center = UNUserNotificationCenter.current()
        let id = missedTapId(at)
        center.removePendingNotificationRequests(withIdentifiers: [id])
        center.removeDeliveredNotifications(withIdentifiers: [id])
    }

    private static func missedTapId(_ at: Double) -> String {
        "\(missedTapPrefix).\(Int(at))"
    }

    private static func queueURL() -> URL? {
        guard let container = FileManager.default
            .containerURL(forSecurityApplicationGroupIdentifier: appGroup) else {
            return nil
        }
        let directory = container.appendingPathComponent(
            queueDirectory, isDirectory: true
        )
        // Pinned rather than left to the platform default: a Wallet automation
        // runs while the phone is locked, so the class has to be one that
        // survives the lock. It goes on the directory because a new file takes
        // the class of the directory it is created in, and the file below is
        // created by `open`, which cannot carry attributes.
        try? FileManager.default.createDirectory(
            at: directory,
            withIntermediateDirectories: true,
            attributes: [
                .protectionKey: FileProtectionType.completeUntilFirstUserAuthentication
            ]
        )
        return directory.appendingPathComponent(queueFile, isDirectory: false)
    }

    private static func append(_ bytes: Data, to url: URL) {
        let descriptor = open(url.path, O_WRONLY | O_APPEND | O_CREAT, 0o644)
        guard descriptor >= 0 else { return }
        defer { close(descriptor) }
        bytes.withUnsafeBytes { buffer in
            guard let base = buffer.baseAddress else { return }
            var written = 0
            while written < buffer.count {
                let count = Darwin.write(descriptor, base + written, buffer.count - written)
                guard count > 0 else { return }
                written += count
            }
        }
    }
}

private actor PushLedger {
    static let shared = PushLedger()

    private let defaults = SharedStore.store
    private let defaultsKey = SharedStore.pushedPurchasesKey
    private let window: TimeInterval = 10 * 60
    private let settleWindow: TimeInterval = 4 * 24 * 60 * 60

    func claim(_ key: String, repeatsOnSettle: Bool) -> Bool {
        var pushed = recent()
        let id = Self.digest(key)
        if let last = pushed[id] {
            if abs(last.timeIntervalSinceNow) <= window { return false }
            if repeatsOnSettle {
                pushed[id] = nil
                defaults?.set(pushed, forKey: defaultsKey)
                return false
            }
        }
        pushed[id] = Date()
        defaults?.set(pushed, forKey: defaultsKey)
        return true
    }

    func release(_ key: String) {
        var pushed = recent()
        pushed[Self.digest(key)] = nil
        defaults?.set(pushed, forKey: defaultsKey)
    }

    private func recent() -> [String: Date] {
        (defaults?.dictionary(forKey: defaultsKey) as? [String: Date] ?? [:])
            .filter { abs($0.value.timeIntervalSinceNow) <= settleWindow }
    }

    private static func digest(_ key: String) -> String {
        SHA256.hash(data: Data(key.utf8)).map { String(format: "%02x", $0) }.joined()
    }
}

extension String {
    /// Empty strings are how an unset optional text parameter arrives; the wire
    /// format wants a real nil so the app can tell "not given" from "given blank".
    var nilIfEmpty: String? { isEmpty ? nil : self }
}

/// Mirrors `PendingWrite` in `src/domain/meta-values.ts`; the field names
/// are the wire format and cannot be renamed on one side alone.
struct PendingWrite: Codable {
    let id: String
    let amount: Double
    let income: Bool
    let note: String
    let category: String?
    let categoryId: String?
    /// Epoch milliseconds, matching JavaScript's `Date` — not seconds.
    let date: Double
    /// The amount exactly as it arrived, e.g. "€12,40", so the app can recover
    /// which currency it was in: a Wallet transaction is in the *card's*
    /// currency, not the ledger's. Resolved app-side, where the catalog lives.
    let amountText: String?
    /// The Wallet card the purchase was made with, by its name in Wallet. The
    /// app matches it to one of its accounts; nil for a spoken entry.
    let card: String?
    /// An explicit ISO code, when the automation pins one. Beats `amountText`.
    let currency: String?
    /// Identifies the purchase, where `id` identifies this enqueue. Nil for a
    /// spoken entry, which names no purchase outside itself.
    let dedupeKey: String?
    /// The raw notification text a `LogNotificationIntent` run carried; the app
    /// parses the amount and merchant out of it. Nil for every other intent.
    let text: String?
}

struct WalletPushSnapshot: Codable {
    struct Card: Codable {
        let label: String?
        let pick: Bool
    }

    struct Places: Codable {
        let expense: [String: String]
        let income: [String: String]
    }

    struct MissedTap: Codable {
        let title: String
        let body: String
    }

    let cards: [String: Card]
    let missedTap: MissedTap?
    let newPlace: String
    let patterns: NotificationPatterns?
    let places: Places
}

/// A projection of `WidgetProps` in `src/widgets/props.ts`: every figure arrives
/// already formatted in the user's currency and cents preference, so an intent
/// never has to reason about money.
struct IntentSnapshot: Codable {
    struct Budget: Codable {
        let present: Bool
        let name: String
        let periodLabel: String
        let remaining: String
        let remainingCaption: String
        let spent: String
        let limit: String
        let percent: String
    }

    struct Insights: Codable {
        let periodLabel: String
        let rangeLabel: String
        let net: String
        let netPositive: Bool
        let spent: String
        let income: String
    }

    /// Every budget is published because a spoken name arrives as a string that
    /// has to be matched against the real set — see `BudgetQuery`.
    struct NamedBudget: Codable {
        let id: String
        let name: String
        let remaining: String
        let remainingCaption: String
        let spent: String
        let limit: String
        let percent: String
        let periodLabel: String
    }

    let budget: Budget
    let insights: Insights
    /// Ordered overall first, which is the fallback when no budget is named.
    ///
    /// Optional so a snapshot written by an older build still decodes: an
    /// update can run an intent before the app rewrites it, and one missing key
    /// would fail the whole `IntentSnapshot` decode.
    let budgets: [NamedBudget]?
}
