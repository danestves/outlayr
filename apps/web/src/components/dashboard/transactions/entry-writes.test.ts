import type { LedgerBooks } from "@outlayr/backend/confect/ledgerView";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import { describe, expect, it } from "vite-plus/test";

import { prepareLedger } from "../../../lib/dashboard-series-ledger";
import {
    baseOf,
    blankValues,
    createdEntry,
    draftOf,
    editedEntry,
    entryProblem,
    parseFee,
    wallInstant,
    wallText,
} from "./entry-writes";
import type { EntryDraft } from "./entry-writes";

const NOW = Date.parse("2026-11-08T15:00:00Z");
// 22:30 on Nov 7 in Caracas (UTC-4), already Nov 8 in UTC.
const LATE = Date.parse("2026-11-08T02:30:00Z");
const OCT = Date.parse("2026-10-01T15:00:00Z");

const envelope = (localId: string) => ({ deletedAt: null, deviceId: "d", localId, seq: 1, updatedAt: 5, userId: "u" });

const doc = (localId: string, extra: Record<string, unknown> = {}) => ({
    ...envelope(localId),
    accountId: "chase",
    amount: 100,
    amountUsd: 2,
    categoryId: "food",
    currency: "VES",
    customColor: null,
    date: OCT,
    day: OCT,
    details: null,
    emoji: null,
    exchangeRate: 50,
    exchangeRateType: "official",
    icon: null,
    imageColor: null,
    imageKey: "logo-key",
    income: false,
    month: OCT,
    note: "Farmatodo",
    onceRecurring: false,
    recurringCoefficient: 1,
    recurringEndDate: null,
    recurringType: 0,
    ...extra,
});

const ledgerWith = (transactions: unknown[]) =>
    prepareLedger(
        {
            accounts: [
                { ...envelope("chase"), currency: "USD", initialBalance: 0, initialBalanceDate: 0, name: "Chase" },
            ],
            appMeta: [
                { key: "timeZone", value: "America/Caracas" },
                { key: "currency", value: "USD" },
            ],
            budgets: [],
            categories: [
                {
                    ...envelope("food"),
                    color: "#000",
                    emoji: null,
                    icon: null,
                    income: false,
                    name: "Food",
                    parentId: null,
                    sortOrder: 0,
                },
            ],
            exchangeRates: [
                { date: "2026-09-01", quote: "VES", rate: 50, rateType: "official" },
                { date: "2026-10-20", quote: "VES", rate: 100, rateType: "official" },
            ],
            installmentPlans: [],
            installments: [],
            mainBudget: [],
            outsideMoves: [],
            outsidePayments: [],
            savingsGoals: [],
            transactions,
            transfers: [],
        } as unknown as LedgerBooks,
        NOW
    );

const entryDraft = (patch: Partial<EntryDraft> = {}): EntryDraft => ({
    accountId: "chase",
    amount: 100,
    categoryId: "food",
    currency: "VES",
    date: OCT,
    details: "",
    fee: null,
    feeNote: "Fee · Farmatodo",
    income: false,
    note: "Farmatodo",
    recurringCoefficient: 1,
    recurringEndDate: null,
    recurringType: 0,
    ...patch,
});

describe("createdEntry", () => {
    it("files a late entry on the ledger's day and month, not the browser's", () => {
        const [row] = createdEntry(
            ledgerWith([]),
            "new",
            entryDraft({ currency: "USD", date: LATE, recurringType: 3 }),
            NOW
        );
        expect(row?.fields).toMatchObject({
            date: LATE,
            day: Date.parse("2026-11-07T04:00:00Z"),
            month: Date.parse("2026-11-01T04:00:00Z"),
            onceRecurring: true,
            recurringAnchorDay: 7,
            recurringType: 3,
        });
    });

    it("freezes USD at the rate of the entry's own day and charges the fee in the card's currency", () => {
        const rows = createdEntry(ledgerWith([]), "new", entryDraft({ fee: { amount: null, rate: 0.03 } }), NOW);
        expect(rows[0]?.fields).toMatchObject({ amount: 100, amountUsd: 2, currency: "VES", exchangeRate: 50 });
        expect(rows[1]?.fields).toMatchObject({
            accountId: "chase",
            amount: 0.06,
            currency: "USD",
            feeForId: "new",
            feeRate: 0.03,
            note: "Fee · Farmatodo",
        });
    });

    it("charges no fee on income or without an account", () => {
        const fee = { amount: 2, rate: null };
        expect(createdEntry(ledgerWith([]), "new", entryDraft({ fee, income: true }), NOW)).toHaveLength(1);
        expect(createdEntry(ledgerWith([]), "new", entryDraft({ accountId: null, fee }), NOW)).toHaveLength(1);
    });
});

describe("editedEntry", () => {
    it("keeps the frozen USD and the phone's fields when only the note changes", () => {
        // The stored rate differs from today's table, so a re-freeze would be caught.
        const entry = doc("a", { amountUsd: 1.9, exchangeRate: 52.6, paidVia: "card" });
        const [row] = editedEntry(ledgerWith([entry]), entry as never, entryDraft({ note: "Locatel" }), NOW);
        expect(row).toMatchObject({ deletedAt: null, localId: "a", updatedAt: NOW });
        expect(row?.fields).toMatchObject({
            amountUsd: 1.9,
            exchangeRate: 52.6,
            imageKey: "logo-key",
            note: "Locatel",
            paidVia: "card",
        });
    });

    it("re-freezes at the new day's rate when the date moves", () => {
        const entry = doc("a");
        const moved = Date.parse("2026-11-01T15:00:00Z");
        const [row] = editedEntry(ledgerWith([entry]), entry as never, entryDraft({ date: moved }), NOW);
        expect(row?.fields).toMatchObject({ amountUsd: 1, exchangeRate: 100 });
    });

    it("adds, rewrites in place and retires the card fee", () => {
        const entry = doc("a");
        const saved = doc("fee", {
            amount: 5,
            amountUsd: 5,
            currency: "USD",
            feeForId: "a",
            feeRate: null,
            note: "Mine",
        });
        const fee = { amount: 7, rate: null };

        const added = editedEntry(ledgerWith([entry]), entry as never, entryDraft({ fee }), NOW);
        expect(added[1]?.fields).toMatchObject({ amount: 7, feeForId: "a" });

        const [, rewritten] = editedEntry(ledgerWith([entry, saved]), entry as never, entryDraft({ fee }), NOW);
        expect(rewritten).toMatchObject({ localId: "fee" });
        expect(rewritten?.fields).toMatchObject({ amount: 7, amountUsd: 7, note: "Mine" });

        const [, retired] = editedEntry(ledgerWith([entry, saved]), entry as never, entryDraft(), NOW);
        expect(retired).toMatchObject({ deletedAt: NOW, localId: "fee" });
    });
});

describe("draftOf", () => {
    const seconds = Date.parse("2026-10-01T15:00:37Z");

    it("leaves what nobody touched exact, so opening and leaving an old entry cannot re-freeze it", () => {
        const entry = doc("a", { amount: 10.126, amountUsd: 0.2, currency: "USD", date: seconds, exchangeRate: 1 });
        const ledger = ledgerWith([entry]);
        const base = baseOf(ledger, entry as never);
        const draft = draftOf(ledger, base.start, base, "");
        expect(draft).toMatchObject({ amount: 10.126, date: seconds });
        expect(editedEntry(ledger, entry as never, draft, NOW)[0]?.fields).toMatchObject({ amountUsd: 0.2 });
    });

    it("reads a custom rate's three decimals as decimals, so a note edit keeps the frozen USD", () => {
        const entry = doc("a", { amount: 100, amountUsd: 1.995092, exchangeRate: 50.123, exchangeRateType: "custom" });
        const current = ledgerWith([entry]);
        const base = baseOf(current, entry as never);
        const { start } = base;
        const noteOnly = draftOf(current, { ...start, note: "new" }, base, "");
        expect(editedEntry(current, entry as never, noteOnly, NOW)[0]?.fields).toMatchObject({
            amountUsd: 1.995092,
            exchangeRate: 50.123,
        });
        expect(draftOf(current, { ...start, rateText: "48.125" }, base, "").rate?.custom).toBe(48.125);
    });

    it("goes back to official after a custom rate was saved from the same drawer", () => {
        const opened = doc("a", { amount: 100, amountUsd: 2, exchangeRate: 50, exchangeRateType: "official" });
        const saved = { ...opened, amountUsd: 4, exchangeRate: 25, exchangeRateType: "custom" };
        const base = baseOf(ledgerWith([opened]), opened as never);
        const current = ledgerWith([saved]);
        const draft = draftOf(current, { ...base.start, rateType: "official" }, base, "");
        expect(draft.rate).toStrictEqual({ custom: null, type: "official" });
    });

    it("keeps a custom rate through an amount edit instead of falling back to the official one", () => {
        const entry = doc("a", { amountUsd: 4, exchangeRate: 25, exchangeRateType: "custom" });
        const ledger = ledgerWith([entry]);
        const base = baseOf(ledger, entry as never);
        const draft = draftOf(ledger, { ...base.start, amountText: "200" }, base, "");
        expect(editedEntry(ledger, entry as never, draft, NOW)[0]?.fields).toMatchObject({
            amount: 200,
            amountUsd: 8,
            exchangeRate: 25,
            exchangeRateType: "custom",
        });
    });

    it("recharges a saved percent fee on the new amount and keeps it when only the note moved", () => {
        const entry = doc("a", { amount: 100, amountUsd: 100, currency: "USD", exchangeRate: 1 });
        const fee = doc("fee", { amount: 3.01, amountUsd: 3.01, currency: "USD", feeForId: "a", feeRate: 0.03 });
        const ledger = ledgerWith([entry, fee]);
        const base = baseOf(ledger, entry as never);
        expect(base.start.feeText).toBe("3%");
        const noted = draftOf(ledger, { ...base.start, note: "Other" }, base, "");
        expect(editedEntry(ledger, entry as never, noted, NOW)[1]?.fields).toMatchObject({ amount: 3.01 });
        const raised = draftOf(ledger, { ...base.start, amountText: "200" }, base, "");
        expect(editedEntry(ledger, entry as never, raised, NOW)[1]?.fields).toMatchObject({ amount: 6, feeRate: 0.03 });
    });

    it("keeps a monthly anchor on the 31st when a charge clamped to the 28th gets a note", () => {
        const february = Date.parse("2026-02-28T15:00:00Z");
        const entry = doc("a", {
            date: february,
            onceRecurring: true,
            recurringAnchorDay: 31,
            recurringType: RECURRING_TYPE.monthly,
        });
        const current = ledgerWith([entry]);
        const base = baseOf(current, entry as never);
        const draft = draftOf(current, { ...base.start, note: "new" }, base, "");
        expect(editedEntry(current, entry as never, draft, NOW)[0]?.fields).toMatchObject({ recurringAnchorDay: 31 });
    });

    it("keeps the mark on a back-filled charge when its note is edited", () => {
        const entry = doc("a", { onceRecurring: true, recurringType: 0 });
        const ledger = ledgerWith([entry]);
        const base = baseOf(ledger, entry as never);
        const draft = draftOf(ledger, { ...base.start, note: "Other" }, base, "");
        expect(editedEntry(ledger, entry as never, draft, NOW)[0]?.fields).toMatchObject({
            onceRecurring: true,
            recurringType: 0,
        });
    });
});

describe("entryProblem", () => {
    const ledger = ledgerWith([]);
    const blank = () => blankValues(ledger, null, NOW);

    it("asks for an amount and a category on a new entry, and a date when it is cleared", () => {
        const draftWith = (patch: Partial<ReturnType<typeof blank>>) =>
            draftOf(ledger, { ...blank(), ...patch }, null, "");
        expect(entryProblem(ledger, draftWith({ categoryId: "food" }), null, NOW)).toBe("amount");
        expect(entryProblem(ledger, draftWith({ amountText: "5" }), null, NOW)).toBe("category");
        expect(entryProblem(ledger, draftWith({ amountText: "5", categoryId: "food", dateText: "" }), null, NOW)).toBe(
            "date"
        );
        expect(entryProblem(ledger, draftWith({ amountText: "5", categoryId: "food" }), null, NOW)).toBeNull();
    });

    it("lets an entry that never had a category stay without one", () => {
        const entry = doc("a", { categoryId: null });
        const withEntry = ledgerWith([entry]);
        const base = baseOf(withEntry, entry as never);
        const draft = draftOf(withEntry, base.start, base, "");
        expect(entryProblem(withEntry, draft, entry as never, NOW)).toBeNull();
    });

    it("stops a currency with no rate at all, which only a phone could ever repair", () => {
        const draft = draftOf(ledger, { ...blank(), amountText: "5", categoryId: "food", currency: "COP" }, null, "");
        expect(entryProblem(ledger, draft, null, NOW)).toBe("rateMissing");
    });
});

describe("parseFee", () => {
    it("reads a percent as a rate and anything else as money in the currency", () => {
        expect(parseFee("3%", "USD")).toStrictEqual({ amount: null, rate: 0.03 });
        expect(parseFee("2,5 %", "USD")).toStrictEqual({ amount: null, rate: 0.025 });
        expect(parseFee("0.125%", "USD")).toStrictEqual({ amount: null, rate: 0.00125 });
        expect(parseFee("$3.72", "USD")).toStrictEqual({ amount: 3.72, rate: null });
        expect(parseFee("", "USD")).toBeNull();
        expect(parseFee("0%", "USD")).toBeNull();
    });
});

describe("wall clock", () => {
    it("round trips an instant through the ledger's zone", () => {
        const ledger = ledgerWith([]);
        expect(wallText(LATE, ledger)).toBe("2026-11-07T22:30");
        expect(wallInstant("2026-11-07T22:30", ledger)).toBe(LATE);
    });
});
