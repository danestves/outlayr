import Foundation

struct NotificationPatterns: Codable {
    struct Pattern: Codable {
        let ignoreCase: Bool
        let source: String

        func range(in text: String, group: Int = 0) -> Range<String.Index>? {
            guard let regex = try? NSRegularExpression(pattern: source, options: ignoreCase ? .caseInsensitive : []),
                  let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)) else {
                return nil
            }
            return Range(match.range(at: group), in: text)
        }

        func matches(_ text: String) -> Bool {
            range(in: text) != nil
        }
    }

    let afterNumber: Pattern
    /// Optional so a snapshot written before the discount and balance cues existed still decodes.
    let balanceAfter: Pattern?
    let balanceBefore: Pattern?
    let cardReference: Pattern
    let declined: Pattern
    let incoming: Pattern
    let money: Pattern
    let paidTo: Pattern
    let parenthesized: Pattern
    let posPrefix: Pattern
    let promoAfter: Pattern?
    let promoBefore: Pattern?
    let receivedFrom: Pattern
}

struct NotificationPurchase {
    let amountText: String
    let income: Bool
    let merchant: String?

    init?(_ text: String, patterns: NotificationPatterns) {
        guard let money = Self.charge(in: text, patterns: patterns), !patterns.declined.matches(text) else {
            return nil
        }
        let amountText = text[money].trimmingCharacters(in: .whitespacesAndNewlines)
        guard let amount = LogWalletTransactionIntent.parseAmount(amountText), amount > 0 else {
            return nil
        }
        let income = patterns.incoming.matches(text)
        let tail = String(text[money.upperBound...])
        let raw: String?
        if let named = (income ? patterns.receivedFrom : patterns.paidTo).range(in: tail, group: 1)
            .flatMap({ tail[$0].trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty }) {
            raw = patterns.cardReference.matches(named)
                ? patterns.parenthesized.range(in: tail, group: 1).map { String(tail[$0]) }
                : named
        } else {
            raw = Self.lineBefore(text[..<money.lowerBound], patterns: patterns)
        }
        self.amountText = amountText
        self.income = income
        merchant = raw.flatMap { Self.clean($0, patterns: patterns) }
    }

    /// The first amount that is not a discount or a balance, matching `chargeMoney` in
    /// `src/domain/parse-notification.ts` so the push and the ledger agree on what was read.
    private static func charge(in text: String, patterns: NotificationPatterns) -> Range<String.Index>? {
        guard let regex = try? NSRegularExpression(
            pattern: patterns.money.source,
            options: patterns.money.ignoreCase ? .caseInsensitive : []
        ) else {
            return nil
        }
        for match in regex.matches(in: text, range: NSRange(text.startIndex..., in: text)) {
            guard let money = Range(match.range, in: text) else { continue }
            if !notACharge(text, money, patterns: patterns) {
                return money
            }
        }
        return nil
    }

    private static func notACharge(
        _ text: String,
        _ money: Range<String.Index>,
        patterns: NotificationPatterns
    ) -> Bool {
        let before = String(text[..<money.lowerBound])
        let after = String(text[money.upperBound...])
        return patterns.promoBefore?.matches(before) == true
            || patterns.promoAfter?.matches(after) == true
            || patterns.balanceBefore?.matches(before) == true
            || patterns.balanceAfter?.matches(after) == true
    }

    private static func clean(_ raw: String, patterns: NotificationPatterns) -> String? {
        let head = String(raw.prefix { $0 != "," })
        let stripped = patterns.posPrefix.range(in: head).map { head.replacingCharacters(in: $0, with: "") } ?? head
        return stripped.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty
    }

    private static func lineBefore(_ above: Substring, patterns: NotificationPatterns) -> String? {
        let lines = above.split(separator: "\n", omittingEmptySubsequences: false)
        guard lines.count >= 2, lines[lines.count - 1].trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return nil
        }
        let line = lines[lines.count - 2].trimmingCharacters(in: .whitespacesAndNewlines)
        return line.isEmpty || patterns.afterNumber.matches(line) ? nil : line
    }
}
