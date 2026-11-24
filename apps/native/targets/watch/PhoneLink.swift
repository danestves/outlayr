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
    static let retryKey = "retryWrites"
    private static let retryDelay: Duration = .seconds(60)

    private(set) var snapshot: WatchSnapshot?
    private(set) var unsynced: [WatchWrite] = []
    @ObservationIgnored private var backgroundTasks: [WKWatchConnectivityRefreshBackgroundTask] = []
    // Only writes the phone failed to save: one it accepted is never resent, so a missed snapshot cannot file it
    // twice or bring it back after an erase.
    @ObservationIgnored private var retrying: Set<String> = []
    @ObservationIgnored private var attempting: Set<String> = []
    @ObservationIgnored private var retryScheduled = false

    private override init() {
        super.init()
        snapshot = Self.restore()
        unsynced = Self.restoreUnsynced()
        retrying = Set(UserDefaults.standard.stringArray(forKey: Self.retryKey) ?? [])
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
            handOff(write.id, message)
            return
        }
        session.sendMessage(message) { reply in
            Task { @MainActor in
                self.attempting.remove(write.id)
                if reply["ok"] as? Bool == true {
                    self.settle(write.id)
                } else if reply["retry"] as? Bool == true {
                    self.retry(write.id)
                } else {
                    self.reject(write.id)
                }
            }
        } errorHandler: { _ in
            self.handOff(write.id, message)
        }
    }

    // A queued transfer is durable and protected from snapshot pruning while outstanding, and the phone sends a
    // failed save back as a retry, so the write can leave the retry set here.
    private func handOff(_ id: String, _ message: [String: Any]) {
        WCSession.default.transferUserInfo(message)
        Task { @MainActor in
            self.attempting.remove(id)
            self.settle(id)
        }
    }

    @MainActor
    private func settle(_ id: String) {
        guard retrying.remove(id) != nil else { return }
        persistUnsynced()
    }

    @MainActor
    private func reject(_ id: String) {
        unsynced.removeAll { $0.id == id }
        retrying.remove(id)
        persistUnsynced()
        WKInterfaceDevice.current().play(.failure)
    }

    @MainActor
    private func retry(_ id: String) {
        guard unsynced.contains(where: { $0.id == id }) else { return }
        retrying.insert(id)
        persistUnsynced()
        guard !retryScheduled else { return }
        retryScheduled = true
        Task { @MainActor in
            try? await Task.sleep(for: Self.retryDelay)
            self.retryScheduled = false
            self.resend()
        }
    }

    // A write stays in the set until the phone accepts it or it is queued as a transfer, so neither a relaunch
    // nor a snapshot mid-send can drop it. One attempt at a time, so a timer and a reachability change never both
    // send it.
    @MainActor
    private func resend() {
        let inFlight = Set(WCSession.default.outstandingUserInfoTransfers.compactMap { Self.writeId($0.userInfo) })
        let ready = unsynced.filter { retrying.contains($0.id) && !attempting.contains($0.id) && !inFlight.contains($0.id) }
        for write in ready {
            attempting.insert(write.id)
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
        Task { @MainActor in self.retry(id) }
    }

    private func receive(_ payload: [String: Any], latest: Bool) {
        Task { @MainActor in
            if payload["type"] as? String == "retry", let id = payload["id"] as? String {
                self.retry(id)
            }
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
        unsynced.removeAll {
            landed.contains($0.id) || ($0.date < since && !inFlight.contains($0.id) && !retrying.contains($0.id))
        }
        retrying.formIntersection(unsynced.map(\.id))
        persistUnsynced()
        if let data = try? JSONEncoder().encode(snapshot) {
            UserDefaults(suiteName: Self.appGroup)?.set(data, forKey: Self.snapshotKey)
            WidgetCenter.shared.reloadAllTimelines()
        }
    }

    private func persistUnsynced() {
        UserDefaults.standard.set(try? JSONEncoder().encode(unsynced), forKey: Self.unsyncedKey)
        UserDefaults.standard.set(Array(retrying), forKey: Self.retryKey)
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
