import AppIntents
import Foundation

/// The Shortcuts "Transaction" trigger (iOS 17+, "Wallet" on iOS 26+) hands its
/// Amount over as *text* — "$12.40", "12,40 €" — not a number, and pointing that
/// at a `Double` parameter makes Shortcuts coerce it. Parsing the string here is
/// why this is separate from `LogTransactionIntent`.
///
/// The trigger is known to time out waiting on slow card providers, so this must
/// stay fast: like every write intent it queues rather than touching the store.
struct LogWalletTransactionIntent: AppIntent {
    static var title: LocalizedStringResource = "Log a Wallet Transaction"

    static var description = IntentDescription(
        """
        Adds a Wallet purchase to your ledger. Built for a Transaction automation: \
        pass the Merchant and Amount straight through, no formatting needed.
        """
    )

    static var openAppWhenRun: Bool = false

    @Parameter(title: "Merchant")
    var merchant: String

    /// Text, not a number — see the type note above.
    @Parameter(title: "Amount")
    var amount: String

    /// The trigger's "Card or Pass": the card's name as it reads in Wallet,
    /// e.g. "Chase Sapphire" or "Apple Card". The app matches it to an account
    /// by name, which is also where the currency comes from when the amount's
    /// symbol cannot say ("$" is on 22 currencies).
    @Parameter(title: "Card")
    var card: String?

    @Parameter(title: "Type", default: .expense)
    var side: LedgerSide

    /// Only needed when the symbol cannot say which currency it is: "$" is on 22
    /// currencies in the catalog and "£" on 9, so a card in one of those is
    /// otherwise recorded in the ledger's own currency.
    @Parameter(title: "Currency Code")
    var currency: String?

    /// Anything the automation can pass that names the *purchase* rather than
    /// this run of the shortcut. It removes the guesswork from the merchant and
    /// amount heuristic below, which is why it is worth exposing even though the
    /// Transaction trigger is not guaranteed to offer one.
    @Parameter(title: "Transaction ID")
    var transactionId: String?

    static var parameterSummary: some ParameterSummary {
        Summary("Log \(\.$amount) at \(\.$merchant) as \(\.$side)") {
            \.$card
            \.$currency
            \.$transactionId
        }
    }

    func perform() async throws -> some IntentResult & ProvidesDialog {
        guard let value = Self.parseAmount(amount), value > 0 else {
            throw $amount.needsValueError("How much was it?")
        }

        let name = merchant.trimmingCharacters(in: .whitespacesAndNewlines)
        let cardText = card?
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .nilIfEmpty
        let purchase = Self.dedupeKey(
            transactionId: transactionId,
            merchant: name,
            amount: value,
            side: side,
            card: card
        )
        let write = PendingWrite(
            id: UUID().uuidString,
            amount: value,
            income: side == .income,
            note: name,
            // No category: the app infers one from what this merchant was
            // filed under last time.
            category: nil,
            categoryId: nil,
            date: Date().timeIntervalSince1970 * 1000,
            amountText: amount,
            card: cardText,
            currency: currency?
                .trimmingCharacters(in: .whitespacesAndNewlines)
                .uppercased()
                .nilIfEmpty,
            dedupeKey: purchase,
            text: nil
        )
        await SharedStore.enqueue(write)

        let push = Self.push(
            amount: amount.trimmingCharacters(in: .whitespacesAndNewlines),
            merchant: name,
            card: cardText,
            side: side,
            snapshot: SharedStore.walletPush()
        )
        var userInfo: [AnyHashable: Any] = ["walletWrite": write.id, "pickCard": push.pickCard]
        if let cardText {
            userInfo["card"] = cardText
        }
        await SharedStore.notify(title: push.title, body: push.body, userInfo: userInfo, purchase: purchase)
        let summary = name.isEmpty ? "Logged \(amount)" : "Logged \(amount) at \(name)"
        return .result(dialog: IntentDialog("\(summary)."))
    }

    static func push(
        amount: String,
        merchant: String,
        card: String?,
        side: LedgerSide,
        snapshot: WalletPushSnapshot?
    ) -> (title: String, body: String, pickCard: Bool) {
        let title = merchant.isEmpty ? amount : "\(amount) · \(merchant)"
        let line = card.flatMap { snapshot?.cards[$0] }
        let cardLabel = line.map(\.label) ?? card
        let pickCard = line?.pick ?? false
        let places = side == .income ? snapshot?.places.income : snapshot?.places.expense
        let key = merchant.unicodeScalars.map { $0.isASCII ? Character($0).lowercased() : String($0) }.joined()
        let category = merchant.isEmpty ? nil : places?[key]
        let newPlace = merchant.isEmpty || category != nil || pickCard ? nil : snapshot?.newPlace
        return (title, [category, cardLabel, newPlace].compactMap { $0 }.joined(separator: " · "), pickCard)
    }

    /// What makes two runs of this intent one purchase.
    ///
    /// A Transaction automation fires when the card authorizes and again when
    /// the charge settles, so the same purchase arrives twice under two ids.
    /// The key carries no time: how far apart two runs may be and still mean one
    /// purchase is the JS ledger's call — see `WALLET_DEDUPE_WINDOW_MS`, which
    /// `PushLedger` copies. The amount is carried in minor units because
    /// a `Double` renders differently either side of the wire.
    ///
    /// The card is part of the key: the same merchant and amount on two cards
    /// within the window are two purchases, not one settling.
    static func dedupeKey(
        transactionId: String?,
        merchant: String,
        amount: Double,
        side: LedgerSide,
        card: String?
    ) -> String {
        if let external = transactionId?
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .nilIfEmpty {
            return "wallet:id:\(external)"
        }
        let minorUnits = Int((amount * 100).rounded())
        let cardKey = card?
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased() ?? ""
        return "wallet:\(side.rawValue):\(merchant.lowercased()):\(minorUnits):\(cardKey)"
    }

    /// The locale's own currency and decimal formatters run first; the manual
    /// pass covers strings they reject, such as "1,234.56" or "1.234,56".
    ///
    /// The sign is dropped: a refund is a `side` of income, not a negative
    /// expense, matching how the ledger stores amounts.
    static func parseAmount(_ raw: String) -> Double? {
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }

        for style in [NumberFormatter.Style.currency, .decimal] {
            let formatter = NumberFormatter()
            formatter.numberStyle = style
            formatter.locale = .current
            if let number = formatter.number(from: trimmed) {
                return abs(number.doubleValue)
            }
        }

        let digits = trimmed.filter { $0.isNumber || $0 == "." || $0 == "," }
            .trimmingCharacters(in: CharacterSet(charactersIn: ".,"))
        guard !digits.isEmpty else { return nil }

        let dots = digits.filter { $0 == "." }.count
        let commas = digits.filter { $0 == "," }.count
        let decimalSeparator: Character?
        if dots > 0 && commas > 0 {
            // Both present: the later one is the decimal point, the other groups.
            decimalSeparator =
                digits.lastIndex(of: ".")! > digits.lastIndex(of: ",")! ? "." : ","
        } else if let only: Character = dots > 0 ? "." : (commas > 0 ? "," : nil) {
            // One kind of separator is ambiguous: "1,240" is 1240 with US
            // grouping and 1.24 with European decimals. Repetition settles it (a
            // number has one decimal point but may group many times), and
            // otherwise the run length does: minor units are 2 digits in almost
            // every currency, while a group is always exactly 3.
            let trailing = digits.split(separator: only).last.map(\.count) ?? 0
            let occurrences = dots > 0 ? dots : commas
            decimalSeparator = (occurrences > 1 || trailing == 3) ? nil : only
        } else {
            decimalSeparator = nil
        }

        var normalised = digits
        if let separator = decimalSeparator {
            let grouping: Character = separator == "." ? "," : "."
            normalised.removeAll { $0 == grouping }
            normalised = normalised.replacingOccurrences(
                of: String(separator), with: "."
            )
        } else {
            // Every separator was grouping, so none of them survive.
            normalised.removeAll { $0 == "." || $0 == "," }
        }

        return Double(normalised).map(abs)
    }
}
