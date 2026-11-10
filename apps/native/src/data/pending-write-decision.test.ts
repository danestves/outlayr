import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import { describe, expect, it } from "vite-plus/test";

import { withAutologEntry } from "@/domain/autolog-cap";
import type { AutologUsage, PendingWriteLedgerEntry } from "@/domain/meta-values";
import { FREE_AUTOLOG_PER_MONTH } from "@/domain/pro-limits";
import type { PendingWrite } from "@/lib/queue-file";

import { decidePendingWrite, readNotification, WALLET_DEDUPE_WINDOW_MS } from "./pending-write-decision";
import type { FiledRow, PendingWriteFacts, SubscriptionRow } from "./pending-write-decision";

const NOW = new Date("2026-03-04T09:00:00Z").getTime();
const HOUR = 60 * 60 * 1000;
const PURCHASE = "wallet:expense:blue bottle:640";

function walletWrite(id: string, overrides: Partial<PendingWrite> = {}): PendingWrite {
    return {
        amount: 6.4,
        amountText: "$6.40",
        category: null,
        date: NOW,
        dedupeKey: PURCHASE,
        id,
        income: false,
        note: "Blue Bottle",
        ...overrides,
    };
}

function push(id: string, text: string, overrides: Partial<PendingWrite> = {}): PendingWrite {
    const queued = walletWrite(id, {
        amount: 0,
        amountText: null,
        dedupeKey: `notification:expense:${id}`,
        note: "",
        text,
        ...overrides,
    });
    const read = readNotification(queued, undefined);
    if (!read) {
        throw new Error(`The push "${text}" names no amount`);
    }
    return read;
}

const BUS_FARE = "notification:expense:a charge of 1.86 usd (transportes rober s a)";

function busFare(id: string, hoursLater: number, card = "Payoneer"): PendingWrite {
    return push(
        id,
        "USD card charge\nA charge of 1.86 USD was made to your Payoneer USD card XXXX-3111 (TRANSPORTES ROBER S A)",
        { card, date: NOW + hoursLater * HOUR, dedupeKey: BUS_FARE }
    );
}

function facts(overrides: Partial<PendingWriteFacts> = {}): PendingWriteFacts {
    return {
        access: "open",
        banks: [],
        cards: [],
        category: { fallback: "cat-expense", known: null, lookups: true },
        filed: [],
        ledger: [],
        ledgerCurrency: "USD",
        subscriptions: [],
        usage: {},
        ...overrides,
    };
}

function filedAs(id: string, txId: string, overrides: Partial<PendingWriteLedgerEntry> = {}): PendingWriteLedgerEntry {
    return { at: NOW, date: NOW, id, key: PURCHASE, txId, ...overrides };
}

function row(id: string, overrides: Partial<FiledRow> = {}): FiledRow {
    return {
        accountId: null,
        amount: 6.4,
        currency: "USD",
        date: new Date(NOW),
        id,
        income: false,
        note: "Blue Bottle",
        ...overrides,
    };
}

function netflix(overrides: Partial<SubscriptionRow> = {}): SubscriptionRow {
    return {
        accountId: null,
        amount: 9.99,
        currency: "USD",
        date: new Date(NOW),
        id: "sub-netflix",
        note: "Netflix",
        recurringAnchorDay: null,
        recurringCoefficient: 1,
        recurringEndDate: null,
        recurringType: RECURRING_TYPE.daily,
        ...overrides,
    };
}

const CHASE = { currency: "MXN", id: "acc-chase", name: "Chase Sapphire" };
const N26 = { currency: "EUR", id: "acc-n26", name: "N26" };

describe("a purchase the ledger already holds", () => {
    const authorized = facts({ filed: [row("tx-auth")], ledger: [filedAs("auth", "tx-auth")] });

    it.each([
        ["inside the window", WALLET_DEDUPE_WINDOW_MS - 1, PURCHASE, "duplicate"],
        ["past the window", WALLET_DEDUPE_WINDOW_MS + 1, PURCHASE, "file"],
        ["under another purchase key", 0, "wallet:id:txn-99", "file"],
    ])("decides a second run %s", (_case, later, dedupeKey, kind) => {
        const decision = decidePendingWrite(walletWrite("settle", { date: NOW + later, dedupeKey }), authorized);

        expect(decision.kind).toBe(kind);
    });

    it("points a second run of the purchase at the row the first one made", () => {
        expect(decidePendingWrite(walletWrite("settle"), authorized)).toStrictEqual({
            kind: "duplicate",
            relink: true,
            txId: "tx-auth",
        });
    });

    it("skips a replayed write by its enqueue id, however far its key has aged", () => {
        const drainedLate = filedAs("replayed", "tx-auth", { at: NOW + WALLET_DEDUPE_WINDOW_MS * 3, date: undefined });

        expect(decidePendingWrite(walletWrite("replayed"), { ...authorized, ledger: [drainedLate] })).toStrictEqual({
            kind: "duplicate",
            relink: false,
            txId: "tx-auth",
        });
    });
});

describe("a bank that pushes again when a charge settles", () => {
    const ride = (id: string, hoursLater: number, txId: string, key: string | null = BUS_FARE) =>
        filedAs(id, txId, { date: NOW + hoursLater * HOUR, key, source: "notification:payoneer" });
    const rows = [row("tx-1"), row("tx-2")];

    it.each([
        ["folds the settle push into its authorize push", [ride("ride-1", 0, "tx-1")], 20, "tx-1"],
        [
            "pairs the first settle with the first of two rides",
            [ride("ride-1", 0, "tx-1"), ride("ride-2", 10, "tx-2")],
            24,
            "tx-1",
        ],
        [
            "pairs the second settle with the ride still unsettled",
            [ride("ride-1", 0, "tx-1"), ride("ride-2", 10, "tx-2"), ride("settle-1", 24, "tx-1", null)],
            34,
            "tx-2",
        ],
    ])("%s", (_case, ledger, hoursLater, txId) => {
        const decision = decidePendingWrite(busFare("settle", hoursLater), facts({ filed: rows, ledger }));

        expect(decision).toStrictEqual({ kind: "duplicate", relink: true, txId });
    });

    it("files a third fare once both rides have settled", () => {
        const ledger = [
            ride("ride-1", 0, "tx-1"),
            ride("ride-2", 10, "tx-2"),
            ride("settle-1", 24, "tx-1", null),
            ride("settle-2", 34, "tx-2", null),
        ];

        expect(decidePendingWrite(busFare("ride-3", 40), facts({ filed: rows, ledger })).kind).toBe("file");
    });

    it("does not bring back an authorized charge the user deleted", () => {
        const decision = decidePendingWrite(busFare("settle", 20), facts({ ledger: [ride("auth", 0, "tx-1")] }));

        expect(decision.kind).toBe("duplicate");
    });

    it("keeps a repeated push from another bank as its own purchase", () => {
        const ledger = [ride("first", 0, "tx-1")];

        expect(decidePendingWrite(busFare("again", 20, "Revolut"), facts({ filed: rows, ledger })).kind).toBe("file");
    });
});

describe("a bank push for a Wallet tap", () => {
    const tap = filedAs("tap", "tx-tap", { source: "wallet:visa" });
    const tapped = facts({ filed: [row("tx-tap")], ledger: [tap] });
    const fromPayoneer = { card: "Payoneer" };

    it("merges into the tap's row when the amount matches in its currency", () => {
        const decision = decidePendingWrite(push("first", "You paid $6.40 at Blue Bottle", fromPayoneer), tapped);

        expect(decision).toMatchObject({ attach: null, kind: "merge", txId: "tx-tap" });
    });

    it("stays its own purchase when the amount differs in the tap's currency", () => {
        const decision = decidePendingWrite(push("other", "You paid $50.00 at Blue Bottle", fromPayoneer), tapped);

        expect(decision.kind).toBe("file");
    });

    it("stays its own purchase once the same app already fed the tap's row", () => {
        const fed = filedAs("first", "tx-tap", { key: "notification:expense:first", source: "notification:payoneer" });
        const decision = decidePendingWrite(push("second", "You paid $6.40 at Blue Bottle", fromPayoneer), {
            ...tapped,
            ledger: [tap, fed],
        });

        expect(decision.kind).toBe("file");
    });
});

describe("a push for a subscription's charge", () => {
    it.each([
        ["the same price", "9.99", "settle"],
        ["a raise inside the band", "12.99", "settle"],
        ["a one-off far above the price", "120.00", "file"],
        ["a charge under half the price", "4.00", "file"],
    ])("decides %s", (_case, amount, kind) => {
        const decision = decidePendingWrite(
            push("charge", `Paid $${amount} to Netflix`),
            facts({ subscriptions: [netflix()] })
        );

        expect(decision.kind).toBe(kind);
    });

    it("settles the chain's next charge before the sweep has written it", () => {
        const lastMonth = netflix({ date: new Date("2026-02-04T09:00:00Z"), recurringType: RECURRING_TYPE.monthly });

        expect(
            decidePendingWrite(push("march", "Paid $9.99 to Netflix"), facts({ subscriptions: [lastMonth] }))
        ).toMatchObject({ kind: "land", otherwise: { kind: "file" }, parentId: "sub-netflix" });
    });
});

describe("the free autolog cap", () => {
    const fullMonth = () => {
        let usage: AutologUsage = {};
        for (let entry = 0; entry < FREE_AUTOLOG_PER_MONTH; entry += 1) {
            usage = withAutologEntry(usage, NOW, "applied");
        }
        return usage;
    };
    const capped = facts({ access: "free", usage: fullMonth() });
    const lastMonth = netflix({ date: new Date("2026-02-04T09:00:00Z"), recurringType: RECURRING_TYPE.monthly });

    it.each([
        ["holds a purchase that would be a new entry", walletWrite("w1"), capped, "hold"],
        [
            "skips a purchase already filed without holding it",
            walletWrite("settle"),
            { ...capped, filed: [row("tx-auth")], ledger: [filedAs("auth", "tx-auth")] },
            "duplicate",
        ],
        [
            "merges a bank push into the tap it belongs to",
            push("push", "You paid $6.40 at Blue Bottle", { card: "Payoneer" }),
            { ...capped, filed: [row("tx-tap")], ledger: [filedAs("tap", "tx-tap", { source: "wallet:visa" })] },
            "merge",
        ],
        [
            "settles a subscription's charge",
            push("charge", "Paid $9.99 to Netflix"),
            { ...capped, subscriptions: [netflix()] },
            "settle",
        ],
    ])("%s", (_case, write, known, kind) => {
        expect(decidePendingWrite(write, known).kind).toBe(kind);
    });

    it("holds a subscription's charge only when the chain cannot write it", () => {
        const decision = decidePendingWrite(push("march", "Paid $9.99 to Netflix"), {
            ...capped,
            subscriptions: [lastMonth],
        });

        expect(decision).toMatchObject({ kind: "land", otherwise: { kind: "hold" } });
    });
});

describe("the account and currency a card's charge is filed in", () => {
    const accountOf = (write: PendingWrite, known: Partial<PendingWriteFacts>) => {
        const decision = decidePendingWrite(write, facts(known));
        if (decision.kind !== "file") {
            throw new Error(`Decided ${decision.kind}, not a new entry`);
        }
        return {
            accountId: decision.account?.id ?? null,
            currency: decision.currency,
            waits: decision.filing.card?.waits,
        };
    };

    it("files a bank app's push under its account in the charge's currency", () => {
        const banks = ["USD", "EUR"].map((currency) => ({
            currency,
            id: `acc-payoneer-${currency}`,
            name: `Payoneer (${currency})`,
        }));
        const charge = (id: string, amount: string) =>
            push(id, `Card charge\nA charge of ${amount} was made to your Payoneer card XXXX-3111 (ANDALUCIA A PIE)`, {
                card: "Payoneer",
            });

        expect(accountOf(charge("usd", "11.63 USD"), { banks }).accountId).toBe("acc-payoneer-USD");
        expect(accountOf(charge("eur", "9.40 EUR"), { banks }).accountId).toBe("acc-payoneer-EUR");
    });

    it("files a Venezuelan bank's Bs. push in bolívares, not Bolivian bolivianos", () => {
        const charge = push(
            "bs",
            "Compra aprobada\nCompra por Bs. 4.150,50 en Panadería Sol con tu tarjeta terminada en 1234",
            { card: "Banesco" }
        );

        expect(charge.amount).toBe(4150.5);
        expect(accountOf(charge, { banks: [{ currency: "VES", id: "acc-banesco", name: "Banesco" }] })).toMatchObject({
            accountId: "acc-banesco",
            currency: "VES",
        });
    });

    it.each([
        ["takes the account's currency for an ambiguous symbol", "$6.40", "Chase Sapphire Reserve", "acc-chase", "MXN"],
        ["keeps the amount's own currency over the account's", "12,40 zł", "N26", "acc-n26", "PLN"],
        ["leaves a card that matches no account unattached", "$6.40", "Apple Card", null, null],
    ])("%s", (_case, amountText, card, accountId, currency) => {
        const filed = accountOf(walletWrite("a", { amountText, card }), { banks: [CHASE, N26] });

        expect(filed).toMatchObject({ accountId, currency });
    });

    it.each([
        ["waits on its card when the charge names its currency", "USD", [CHASE, N26], true],
        ["does not wait when the currency was a guess", null, [CHASE, N26], false],
        ["does not wait while the ledger has no accounts", "USD", [], false],
    ])("%s", (_case, currency, banks, waits) => {
        const filed = accountOf(walletWrite("a", { card: "Binance Card", currency }), { banks });

        expect(filed.waits).toBe(waits);
    });
});

describe("the name and category a pending write is filed under", () => {
    it.each([
        ["the app that posted it", "Card Suite Lite", "Card Suite Lite"],
        ["a placeholder when no app is known", null, "Bank notification"],
        ["a placeholder when the app name is the card the text names", "card ending with 7909", "Bank notification"],
    ])("files a push nothing could name under %s", (_case, card, note) => {
        const unnamed = push(
            "site",
            "Your transaction was successful\nPayment of USD 22.99 approved on the card ending with 7909.",
            { card }
        );

        expect(decidePendingWrite(unnamed, facts())).toMatchObject({ kind: "file", logoCandidate: false, note });
    });

    it("files a refund push as income and leaves its category to the merchant lookup", () => {
        const refund = push("refund", "Refund of $12.40 from STARBUCKS");

        expect(refund.income).toBe(true);
        expect(decidePendingWrite(refund, facts())).toMatchObject({ categoryId: null, kind: "file", lookup: true });
    });

    it("files a merchant too short to look up under the first category", () => {
        const decision = decidePendingWrite(walletWrite("a", { note: "KL" }), facts());

        expect(decision).toMatchObject({ categoryId: "cat-expense", kind: "file", lookup: false });
    });

    it("drops a pending write with no category to file it under", () => {
        const none = facts({ category: { fallback: null, known: null, lookups: false } });

        expect(decidePendingWrite(walletWrite("a"), none)).toStrictEqual({ kind: "drop" });
    });
});
