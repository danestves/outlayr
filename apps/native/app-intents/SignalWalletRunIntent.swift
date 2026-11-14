import AppIntents
import Foundation

/// Placed first in the shared "Outlayr Wallet" shortcut. It carries no
/// parameters, so it runs on every trigger, declined taps included, which is
/// what lets the app show that the automation is installed and firing even
/// when nothing was logged.
struct SignalWalletRunIntent: AppIntent {
    static var title: LocalizedStringResource = "Signal a Wallet Run"

    static var description = IntentDescription(
        "Tells Outlayr the Wallet automation just ran. Add it before Log a Wallet Transaction."
    )

    static var openAppWhenRun: Bool = false

    func perform() async throws -> some IntentResult {
        let now = Date().timeIntervalSince1970 * 1000
        SharedStore.store?.set(String(Int(now)), forKey: SharedStore.walletRunKey)
        await SharedStore.armMissedTap(at: now, after: SharedStore.missedTapDelay)
        return .result()
    }
}
