import Foundation
import WatchConnectivity

final class WatchLink: NSObject, WCSessionDelegate {
    static let shared = WatchLink()

    static let pendingWriteNotification = Notification.Name("outlayr.watch.pendingWrite")

    static let snapshotKey = "snapshot"

    private var activated = false
    private var latest: String?

    func activate() {
        guard !activated, WCSession.isSupported() else { return }
        activated = true
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    func publish(_ snapshot: String) throws {
        latest = snapshot
        try send()
    }

    private func send() throws {
        let session = WCSession.default
        guard let latest, session.activationState == .activated, session.isPaired, session.isWatchAppInstalled else { return }
        let payload: [String: Any] = [Self.snapshotKey: latest, "at": Date().timeIntervalSince1970 * 1000]
        try session.updateApplicationContext(payload)
        if session.isComplicationEnabled, session.remainingComplicationUserInfoTransfers > 0 {
            session.transferCurrentComplicationUserInfo(payload)
        }
    }

    // MARK: WCSessionDelegate

    func session(_ session: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: Error?) {
        try? send()
    }

    func sessionWatchStateDidChange(_ session: WCSession) {
        try? send()
    }

    func sessionDidBecomeInactive(_ session: WCSession) {}

    func sessionDidDeactivate(_ session: WCSession) {
        session.activate()
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
        Task {
            let accepted = await self.enqueue(message)
            replyHandler(["ok": accepted])
        }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        Task { _ = await self.enqueue(message) }
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        Task { _ = await self.enqueue(userInfo) }
    }

    private func enqueue(_ message: [String: Any]) async -> Bool {
        guard message["type"] as? String == "log",
              let raw = message["write"] as? [String: Any],
              let data = try? JSONSerialization.data(withJSONObject: raw),
              let write = try? JSONDecoder().decode(PendingWrite.self, from: data),
              write.amount > 0 else {
            return false
        }
        // The watch captured this before it reached the phone, possibly hours earlier, so it routes by date, not
        // this device's counter.
        await SharedStore.enqueue(write, sequenced: false)
        NotificationCenter.default.post(name: Self.pendingWriteNotification, object: nil)
        return true
    }
}
