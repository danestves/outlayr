import AppIntents
import Foundation

enum LedgerSide: String, AppEnum {
    case expense
    case income

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Type"

    static var caseDisplayRepresentations: [LedgerSide: DisplayRepresentation] = [
        .expense: "Expense",
        .income: "Income"
    ]
}

/// Deliberately does NOT write the database: the store is `expo-sqlite` inside
/// the app's own container, and the real write path — blank-note fallback to the
/// category name, category resolution, recurrence projection — is TypeScript in
/// `transactionsRepo`. The intent validates, parks the request in the App Group,
/// and the app commits it through `applyPendingWrites` in
/// `src/data/pending-writes-core.ts`.
struct LogTransactionIntent: AppIntent {
    static var title: LocalizedStringResource = "Log a Transaction"

    static var description = IntentDescription(
        "Adds an entry to your ledger. It appears in Outlayr the next time you open it."
    )

    static var openAppWhenRun: Bool = false

    @Parameter(title: "Amount", requestValueDialog: "How much?")
    var amount: Double

    @Parameter(title: "Type", default: .expense)
    var side: LedgerSide

    @Parameter(title: "Name", requestValueDialog: "What was it for?")
    var note: String?

    @Parameter(title: "Category")
    var category: String?

    static var parameterSummary: some ParameterSummary {
        Summary("Log \(\.$amount) as \(\.$side)") {
            \.$note
            \.$category
        }
    }

    func perform() async throws -> some IntentResult & ProvidesDialog {
        let magnitude = abs(amount)
        guard magnitude > 0 else {
            throw $amount.needsValueError("How much was it?")
        }

        let trimmed = note?.trimmingCharacters(in: .whitespacesAndNewlines)
        let write = PendingWrite(
            id: UUID().uuidString,
            amount: magnitude,
            income: side == .income,
            // Left empty on purpose: the app falls back to the category name.
            note: (trimmed?.isEmpty == false ? trimmed : nil) ?? "",
            category: category?.trimmingCharacters(in: .whitespacesAndNewlines),
            categoryId: nil,
            date: Date().timeIntervalSince1970 * 1000,
            // A spoken amount carries no currency, so the app applies the
            // ledger's own.
            amountText: nil,
            card: nil,
            currency: nil,
            // Two identical spoken entries are two entries: only the automation
            // triggers can claim that a repeat is the same purchase.
            dedupeKey: nil,
            text: nil
        )
        await SharedStore.enqueue(write)

        let verb = side == .income ? "Recorded" : "Logged"
        let name = write.note.isEmpty ? "" : " for \(write.note)"
        return .result(
            dialog: IntentDialog("\(verb) \(formatted(magnitude))\(name).")
        )
    }

    /// Plain grouped decimal, not currency-formatted: an intent does not
    /// know the user's currency setting, so a guessed symbol would misreport it.
    private func formatted(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.maximumFractionDigits = value < 100 ? 2 : 0
        return formatter.string(from: NSNumber(value: value)) ?? String(value)
    }
}
