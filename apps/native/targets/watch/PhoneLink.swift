import Foundation
import Observation
import WatchConnectivity
import WatchKit
import WidgetKit

@Observable
final class PhoneLink: NSObject, WCSessionDelegate {
    static let shared = PhoneLink()

    static let appGroup = "group.com.tryoutlayr.app"
    static let snapshotKey = "watchSnapshot"
    static let unsyncedKey = "unsyncedWrites"

    private(set) var snapshot: WatchSnapshot?
    private(set) var unsynced: [WatchWrite] = []
    @ObservationIgnored private var backgroundTasks: [WKWatchConnectivityRefreshBackgroundTask] = []

    private override init() {
        super.init()
        snapshot = Self.restore()
        unsynced = Self.restoreUnsynced()
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    func log(_ write: WatchWrite) {
        unsynced.insert(write, at: 0)
        persistUnsynced()
        send(write)
    }

    func hold(_ task: WKWatchConnectivityRefreshBackgroundTask) {
        backgroundTasks.append(task)
        releaseIfIdle()
    }

    private func send(_ write: WatchWrite) {
        let session = WCSession.default
        let message = write.message
        guard session.isReachable else {
            session.transferUserInfo(message)
            return
        }
        session.sendMessage(message) { reply in
            guard reply["ok"] as? Bool == false, reply["retry"] as? Bool != true else { return }
            Task { @MainActor in self.reject(write.id) }
        } errorHandler: { _ in
            session.transferUserInfo(message)
        }
    }

    @MainActor
    private func reject(_ id: String) {
        unsynced.removeAll { $0.id == id }
        persistUnsynced()
        WKInterfaceDevice.current().play(.failure)
    }

    @MainActor
    private func resend() {
        let inFlight = Set(WCSession.default.outstandingUserInfoTransfers.compactMap { Self.writeId($0.userInfo) })
        for write in unsynced where !inFlight.contains(write.id) {
            send(write)
        }
    }

    func session(_ session: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: Error?) {
        receive(session.receivedApplicationContext, latest: false)
        guard state == .activated else { return }
        Task { @MainActor in self.resend() }
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        guard session.isReachable else { return }
        Task { @MainActor in self.resend() }
    }

    func session(_ session: WCSession, didReceiveApplicationContext context: [String: Any]) {
        receive(context, latest: true)
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        receive(userInfo, latest: false)
    }

    func session(_ session: WCSession, didFinish userInfoTransfer: WCSessionUserInfoTransfer, error: Error?) {
        guard error != nil, let id = Self.writeId(userInfoTransfer.userInfo) else { return }
        Task { @MainActor in self.reject(id) }
    }

    private func receive(_ payload: [String: Any], latest: Bool) {
        Task { @MainActor in
            if let snapshot = Self.load(from: payload),
               latest || snapshot.publishedAt >= self.snapshot?.publishedAt ?? 0 {
                self.apply(snapshot)
            }
            self.releaseIfIdle()
        }
    }

    @MainActor
    private func apply(_ snapshot: WatchSnapshot) {
        self.snapshot = snapshot
        let landed = Set((snapshot.applied?.ids ?? []) + snapshot.entries.compactMap(\.writeId))
        let since = snapshot.applied?.since ?? 0
        let inFlight = Set(WCSession.default.outstandingUserInfoTransfers.compactMap { Self.writeId($0.userInfo) })
        unsynced.removeAll { landed.contains($0.id) || ($0.date < since && !inFlight.contains($0.id)) }
        persistUnsynced()
        if let data = try? JSONEncoder().encode(snapshot) {
            UserDefaults(suiteName: Self.appGroup)?.set(data, forKey: Self.snapshotKey)
            WidgetCenter.shared.reloadAllTimelines()
        }
    }

    private func persistUnsynced() {
        UserDefaults.standard.set(try? JSONEncoder().encode(unsynced), forKey: Self.unsyncedKey)
    }

    private func releaseIfIdle() {
        guard !WCSession.default.hasContentPending else { return }
        backgroundTasks.forEach { $0.setTaskCompletedWithSnapshot(false) }
        backgroundTasks = []
    }

    private static func writeId(_ payload: [String: Any]) -> String? {
        (payload["write"] as? [String: Any])?["id"] as? String
    }

    private static func load(from payload: [String: Any]) -> WatchSnapshot? {
        guard let raw = payload["snapshot"] as? String, let data = raw.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(WatchSnapshot.self, from: data)
    }

    private static func restore() -> WatchSnapshot? {
        guard let data = UserDefaults(suiteName: appGroup)?.data(forKey: snapshotKey) else { return nil }
        return try? JSONDecoder().decode(WatchSnapshot.self, from: data)
    }

    private static func restoreUnsynced() -> [WatchWrite] {
        guard let data = UserDefaults.standard.data(forKey: unsyncedKey) else { return [] }
        return (try? JSONDecoder().decode([WatchWrite].self, from: data)) ?? []
    }
}
