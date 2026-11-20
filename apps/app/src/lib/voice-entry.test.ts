import { namesWithinBudget } from "@outlayr/backend/confect/lib/ledgerPrompt";
import type { VoiceDraft } from "@outlayr/backend/confect/lib/voiceDraft";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import { describe, expect, it } from "vite-plus/test";

import { prepareLedger } from "./dashboard-series-ledger";
import { wallText } from "./entry-writes";
import type { LedgerBooks } from "./ledger-books";
import { answerAt, ledgerToday, promptLedger, resolveVoiceDraft } from "./voice-entry";

// 22:30 on Nov 7 in Caracas (UTC-4), already Nov 8 in UTC.
const LATE = Date.parse("2026-11-08T02:30:00Z");

const envelope = (localId: string) => ({ deletedAt: null, deviceId: "d", localId, seq: 1, updatedAt: 5, userId: "u" });

const account = (localId: string, name: string, currency = "USD") => ({
    ...envelope(localId),
    currency,
    initialBalance: 0,
    initialBalanceDate: 0,
    name,
});

const category = (localId: string, name: string, income = false, parentId: string | null = null) => ({
    ...envelope(localId),
    color: "#000",
    emoji: null,
    icon: null,
    income,
    name,
    parentId,
    sortOrder: 0,
});

const ledgerWith = (accounts: unknown[], categories: unknown[] = []) =>
    prepareLedger(
        {
            accounts,
            appMeta: [
                { key: "timeZone", value: "America/Caracas" },
                { key: "currency", value: "USD" },
            ],
            budgetPlans: [],
            budgets: [],
            categories,
            exchangeRates: [],
            installmentPlans: [],
            installments: [],
            mainBudget: [],
            outsideMoves: [],
            outsidePayments: [],
            savingsGoals: [],
            transactions: [],
            transfers: [],
        } as unknown as LedgerBooks,
        LATE
    );

const books = ledgerWith(
    [account("chase", "Chase"), account("cash", "Cash"), account("ves", "Banesco", "VES")],
    [category("food", "Food"), category("salary", "Salary", true), category("coffee", "Coffee", false, "food")]
);

const sent = { accountsOmitted: false, categoriesOmitted: false };

const entry = (patch: Partial<Extract<VoiceDraft, { kind: "entry" }>> = {}): VoiceDraft => ({
    accountName: "Chase",
    amount: 12,
    categoryName: "Food",
    currency: null,
    date: "2026-11-07",
    details: null,
    domain: null,
    income: false,
    kind: "entry",
    merchant: "Arepera",
    recurrence: null,
    ...patch,
});

const transfer = (patch: Partial<Extract<VoiceDraft, { kind: "transfer" }>> = {}): VoiceDraft => ({
    amount: 50,
    currency: null,
    date: "2026-11-07",
    details: null,
    fromAccountName: "Chase",
    kind: "transfer",
    toAccountName: "Cash",
    ...patch,
});

describe("resolveVoiceDraft dates", () => {
    it("reads today in the ledger's zone, not the browser's UTC day", () => {
        expect(ledgerToday(books, LATE)).toBe("2026-11-07");
    });

    it("keeps the clock for today and files another day at noon", () => {
        const today = resolveVoiceDraft(books, sent, entry(), LATE);
        const earlier = resolveVoiceDraft(books, sent, entry({ date: "2026-11-05" }), LATE);
        expect(today.values.dateText).toBe(wallText(LATE, books));
        expect(earlier.values.dateText).toBe("2026-11-05T12:00");
    });
});

describe("resolveVoiceDraft entries", () => {
    it("matches names without case and leaves nothing for the form", () => {
        const resolved = resolveVoiceDraft(books, sent, entry({ accountName: "chase", categoryName: "COFFEE" }), LATE);
        expect(resolved.kind === "entry" && resolved.values).toMatchObject({
            accountId: "chase",
            categoryId: "coffee",
        });
        expect(resolved.gaps).toEqual([]);
    });

    it("never saves onto one of two accounts with the same name", () => {
        const twins = ledgerWith([account("a", "Wallet"), account("b", "wallet")], [category("food", "Food")]);
        const resolved = resolveVoiceDraft(twins, sent, entry({ accountName: "Wallet" }), LATE);
        expect(resolved.gaps).toContain("account");
    });

    it("does not file an expense under an income category", () => {
        const resolved = resolveVoiceDraft(books, sent, entry({ categoryName: "Salary" }), LATE);
        expect(resolved.kind === "entry" && resolved.values.categoryId).toBeNull();
        expect(resolved.gaps).toContain("category");
    });

    it("hands an every-two-weeks schedule to the form instead of dropping it", () => {
        const monthly = resolveVoiceDraft(books, sent, entry({ recurrence: { every: 1, unit: "month" } }), LATE);
        const biweekly = resolveVoiceDraft(books, sent, entry({ recurrence: { every: 2, unit: "week" } }), LATE);
        expect(monthly.kind === "entry" && monthly.values.recurringType).toBe(RECURRING_TYPE.monthly);
        expect(monthly.gaps).toEqual([]);
        expect(biweekly.gaps).toContain("schedule");
    });

    it("rounds the amount to the currency's places and keeps a spoken foreign currency", () => {
        const resolved = resolveVoiceDraft(books, sent, entry({ amount: 1234.6, currency: "JPY" }), LATE);
        expect(resolved.kind === "entry" && resolved.values).toMatchObject({
            amountText: "¥1,235",
            currency: "JPY",
            currencyByHand: true,
        });
    });
});

describe("resolveVoiceDraft transfers", () => {
    it("matches both sides in the source account's currency", () => {
        const resolved = resolveVoiceDraft(books, sent, transfer(), LATE);
        expect(resolved.kind === "transfer" && resolved.values).toMatchObject({
            fromId: "chase",
            sentText: "$50.00",
            toId: "cash",
        });
        expect(resolved.gaps).toEqual([]);
    });

    it("sends a cross-currency move and a move to itself to the form", () => {
        const crossed = resolveVoiceDraft(books, sent, transfer({ toAccountName: "Banesco" }), LATE);
        const itself = resolveVoiceDraft(books, sent, transfer({ toAccountName: "Chase" }), LATE);
        expect(crossed.gaps).toContain("currency");
        expect(itself.gaps).toContain("account");
    });
});

describe("promptLedger", () => {
    it("trims an oversized ledger to what the server accepts", () => {
        const many = Array.from({ length: 70 }, (_, index) => account(`a${index}`, `Account ${index}`));
        const branches = Array.from({ length: 30 }, (_, index) => category(`c${index}`, `Branch ${index}`));
        const leaves = branches.flatMap((branch) =>
            Array.from({ length: 20 }, (_, index) =>
                category(`${branch.localId}-${index}`, `Leaf ${index}`, false, branch.localId)
            )
        );
        const prompt = promptLedger(ledgerWith(many, [...branches, ...leaves]).books);
        expect(namesWithinBudget(prompt.categoryTree, prompt.accounts)).toBe(true);
        expect(prompt.accountsOmitted).toBe(true);
        expect(prompt.categoriesOmitted).toBe(true);
    });
});

describe("answerAt", () => {
    const proposed = { draft: entry() };
    const message = (
        order: number,
        parts: { output?: unknown; state?: string; type: string }[],
        status = "success"
    ) => ({
        order,
        parts,
        role: "assistant",
        status,
        text: "",
    });

    it("reads the draft answering this turn, not an earlier one", () => {
        const turns = [
            message(0, [{ output: { draft: null }, state: "output-available", type: "tool-proposeDraft" }]),
            message(1, [{ output: proposed, state: "output-available", type: "tool-proposeDraft" }]),
        ];
        expect(answerAt(turns, 1)).toEqual({ kind: "proposed", proposed });
    });

    it("waits while the tool is still running and fails a failed turn", () => {
        const running = [message(1, [{ state: "input-available", type: "tool-proposeDraft" }], "streaming")];
        const failed = [message(1, [], "failed")];
        expect(answerAt(running, 1)).toEqual({ kind: "pending" });
        expect(answerAt(failed, 1)).toEqual({ kind: "failed" });
    });
});
