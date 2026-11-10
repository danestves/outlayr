import { occurrenceId } from "@outlayr/money/occurrence";
import { eq, isNull, ne, sql } from "drizzle-orm";
import * as Effect from "effect/Effect";
import { beforeEach, describe, expect, it, vi, test } from "vite-plus/test";

import type { Database } from "@/db/client";
import { accounts, categories, transactions } from "@/db/schema";
import { migratedDatabase, transactionalDatabase } from "@/db/test-database";
import { withAutologEntry } from "@/domain/autolog-cap";
import type { AutologUsage } from "@/domain/meta-values";
import { DEFAULT_CURRENCY } from "@/domain/money";
import type { PendingWrite } from "@/lib/queue-file";

import { Meta } from "./app-meta-core";
import { readAutologWaiting, writeAutologAccess } from "./autolog-cap-core";
import { cardFeeFor } from "./card-fees-core";
import { WALLET_DEDUPE_WINDOW_MS } from "./pending-write-decision";
import { appliedWriteIds, applyPendingWrites, drainPendingWrites, pendingWriteTxId } from "./pending-writes-core";
import { backfillRecurring } from "./recurrence-backfill";
import { transactionsRepo } from "./transactions-core";
import { fileWaitingPurchases, pickCardAccount, takeRepriced } from "./wallet-state-core";

const makeDb = migratedDatabase;

const NOW = new Date("2026-03-04T09:00:00Z");
const PURCHASE = "wallet:expense:blue bottle:640";

async function seedCategories(db: Database): Promise<void> {
    await db.insert(categories).values([
        {
            id: "cat-expense",
            income: false,
            name: "Coffee",
            sortOrder: 0,
            updatedAt: NOW,
        },
        {
            id: "cat-income",
            income: true,
            name: "Salary",
            sortOrder: 0,
            updatedAt: NOW,
        },
    ]);
}

function walletWrite(id: string, overrides: Partial<PendingWrite> = {}): PendingWrite {
    return {
        amount: 6.4,
        amountText: "$6.40",
        category: null,
        date: NOW.getTime(),
        dedupeKey: PURCHASE,
        id,
        income: false,
        note: "Blue Bottle",
        ...overrides,
    };
}

const HOUR = 60 * 60 * 1000;

async function seedAccounts(db: Database): Promise<void> {
    await db.insert(accounts).values([
        {
            currency: "MXN",
            dateCreated: NOW,
            id: "acc-chase",
            initialBalanceDate: NOW,
            name: "Chase Sapphire",
            updatedAt: NOW,
        },
        {
            currency: "EUR",
            dateCreated: NOW,
            id: "acc-n26",
            initialBalanceDate: NOW,
            name: "N26",
            updatedAt: NOW,
        },
    ]);
}

async function liveRows(db: Database) {
    return db.select({ id: transactions.id, note: transactions.note }).from(transactions);
}

/** {@link liveRows} without the tombstones, which is what the name suggests. */
async function undeleted(db: Database) {
    return db.select({ id: transactions.id }).from(transactions).where(isNull(transactions.deletedAt));
}

describe("applyPendingWrites", () => {
    let db: Database;

    beforeEach(async () => {
        db = makeDb();
        await seedCategories(db);
        // The baseline is someone who allowed the AI providers, so an unseen merchant waits on the lookup.
        await Effect.runPromise(Meta.set(db, "aiConsentV2", true));
    });

    it("counts the expenses Wallet and bank pushes logged on their own, not entries made on purpose or replays", async () => {
        const wallet = walletWrite("wallet-1");
        const push = walletWrite("push-1", {
            amount: 12,
            amountText: "$12.00",
            dedupeKey: "notification:expense:coffee lab",
            date: NOW.getTime() + HOUR,
            note: "Coffee Lab",
        });
        const shortcut = walletWrite("shortcut-1", { dedupeKey: null, note: "Kiosk" });
        const watch = walletWrite("watch-1", { categoryId: "cat-expense", dedupeKey: null, note: "Tea" });
        const salary = walletWrite("salary-1", {
            amount: 900,
            amountText: "$900.00",
            dedupeKey: "notification:income:acme",
            income: true,
            note: "Acme",
        });

        const first = await Effect.runPromise(applyPendingWrites(db, [wallet, push, shortcut, watch, salary], NOW));
        const replay = await Effect.runPromise(applyPendingWrites(db, [wallet, push], NOW));

        expect(first).toStrictEqual({ applied: 5, autologged: 2 });
        expect(replay).toStrictEqual({ applied: 0, autologged: 0 });
    });

    it("reads a notification job's amount and merchant, and files it by account", async () => {
        await seedAccounts(db);
        const job = walletWrite("push", {
            amount: 0,
            amountText: null,
            card: "Chase",
            dedupeKey: "notification:expense:x",
            note: "",
            text: "Purchase alert\nYou made a $12.40 purchase at STARBUCKS with your card ending in 4321.",
        });

        const { applied } = await Effect.runPromise(applyPendingWrites(db, [job], NOW));

        expect(applied).toBe(1);
        const [row] = await db
            .select({
                accountId: transactions.accountId,
                amount: transactions.amount,
                currency: transactions.currency,
                note: transactions.note,
            })
            .from(transactions);
        expect(row).toStrictEqual({ accountId: "acc-chase", amount: 12.4, currency: "MXN", note: "STARBUCKS" });
    });

    it("registers no logo candidate for a push filed under a placeholder name", async () => {
        const push = walletWrite("bare", {
            amount: 0,
            amountText: null,
            dedupeKey: "notification:expense:bare",
            note: "",
            text: "Your transaction was successful\nPayment of USD 9.99 approved on the card ending with 7909.",
        });

        await Effect.runPromise(applyPendingWrites(db, [push], NOW));

        await expect(liveRows(db)).resolves.toMatchObject([{ note: "Bank notification" }]);
        await expect(Effect.runPromise(Meta.get(db, "logoCandidates"))).resolves.toStrictEqual({});
    });

    it("marks the last entry as a push only when a notification logged it", async () => {
        const push = walletWrite("push", {
            amount: 0,
            amountText: null,
            dedupeKey: "notification:expense:x",
            note: "",
            text: "You paid $12.40 at STARBUCKS",
        });

        await Effect.runPromise(applyPendingWrites(db, [push], NOW));
        expect((await Effect.runPromise(Meta.get(db, "lastWalletEntry")))?.push).toBe(true);

        await Effect.runPromise(applyPendingWrites(db, [walletWrite("tap")], NOW));
        expect((await Effect.runPromise(Meta.get(db, "lastWalletEntry")))?.push).toBeUndefined();
    });

    it("folds the bank's push for a Wallet tap into the tap's row across currencies", async () => {
        await seedAccounts(db);
        const tap = walletWrite("tap", {
            amount: 22.6,
            amountText: "€22.60",
            card: "N26",
            dedupeKey: "wallet:expense:sumup *fantoni grazia:2260:n26",
            note: "SumUp *Fantoni Grazia",
        });
        const push = walletWrite("push", {
            amount: 0,
            amountText: null,
            card: "Payoneer",
            date: NOW.getTime() + 30_000,
            dedupeKey: "notification:expense:payoneer",
            note: "",
            text: "Card payment\nYou paid $24.10 at FANTONI GRAZIA, Florence",
        });

        await Effect.runPromise(applyPendingWrites(db, [tap, push], NOW));

        const rows = await db.select({ amount: transactions.amount, id: transactions.id }).from(transactions);
        expect(rows).toStrictEqual([{ amount: 22.6, id: rows[0]?.id }]);
        await expect(Effect.runPromise(pendingWriteTxId(db, "push"))).resolves.toBe(rows[0]?.id);
        expect((await Effect.runPromise(Meta.get(db, "walletCards"))).map((card) => card.text)).toContain("Payoneer");
    });

    it("gives the tap's row the account the bank push resolves", async () => {
        await seedAccounts(db);
        const push = walletWrite("push", {
            amount: 0,
            amountText: null,
            card: "N26",
            dedupeKey: "notification:expense:n26",
            note: "",
            text: "€6.40 at Blue Bottle",
        });

        await Effect.runPromise(
            applyPendingWrites(db, [walletWrite("tap", { amountText: "€6.40", card: "Visa 1234" }), push], NOW)
        );

        const rows = await db.select({ accountId: transactions.accountId }).from(transactions);
        expect(rows).toStrictEqual([{ accountId: "acc-n26" }]);
    });

    it("settles a subscription's occurrence instead of adding a twin, once", async () => {
        const push = (id: string) =>
            walletWrite(id, {
                amount: 0,
                amountText: null,
                dedupeKey: `notification:expense:${id}`,
                note: "",
                text: "Card payment\nPaid $9.99 to Netflix",
            });
        await db.insert(transactions).values({
            amount: 9.99,
            categoryId: "cat-expense",
            currency: DEFAULT_CURRENCY,
            date: new Date(NOW.getTime() + 2 * 24 * 60 * 60 * 1000),
            day: NOW,
            id: "sub-netflix",
            income: false,
            month: NOW,
            note: "Netflix",
            onceRecurring: true,
            recurringType: 1,
            updatedAt: NOW,
        });

        await Effect.runPromise(applyPendingWrites(db, [push("october")], NOW));

        await expect(liveRows(db)).resolves.toStrictEqual([{ id: "sub-netflix", note: "Netflix" }]);
        expect((await Effect.runPromise(Meta.get(db, "lastWalletEntry")))?.txId).toBe("sub-netflix");

        await Effect.runPromise(applyPendingWrites(db, [push("again")], NOW));

        await expect(liveRows(db)).resolves.toHaveLength(2);
    });

    it("writes the chain's next charge itself when the push lands before the sweep", async () => {
        await db.insert(transactions).values({
            amount: 9.99,
            categoryId: "cat-expense",
            currency: DEFAULT_CURRENCY,
            date: new Date("2026-02-04T09:00:00Z"),
            day: new Date("2026-02-04T09:00:00Z"),
            id: "sub-netflix",
            income: false,
            month: new Date("2026-02-01T09:00:00Z"),
            note: "Netflix",
            onceRecurring: true,
            recurringType: 3,
            updatedAt: NOW,
        });
        const job = walletWrite("march", {
            amount: 0,
            amountText: null,
            dedupeKey: "notification:expense:march",
            note: "",
            text: "Paid $12.99 to Netflix",
        });

        await Effect.runPromise(applyPendingWrites(db, [job], NOW));

        const rows = await db
            .select({ amount: transactions.amount, id: transactions.id, recurringType: transactions.recurringType })
            .from(transactions)
            .where(isNull(transactions.deletedAt));
        expect(rows).toHaveLength(2);
        const occurrence = rows.find((row) => row.id !== "sub-netflix");
        expect(occurrence).toMatchObject({ amount: 12.99, recurringType: 3 });
        expect((await Effect.runPromise(Meta.get(db, "lastWalletEntry")))?.txId).toBe(occurrence?.id);
    });

    it("dates a subscription's charge at its push, so it shows at once and the chain keeps the time", async () => {
        const written = new Date(2026, 2, 5, 12, 0);
        const charged = new Date(2026, 2, 4, 18, 42);
        await db.insert(transactions).values({
            amount: 9.99,
            categoryId: "cat-expense",
            currency: DEFAULT_CURRENCY,
            date: written,
            day: new Date(2026, 2, 5),
            id: "sub-netflix",
            income: false,
            month: new Date(2026, 2, 1),
            note: "Netflix",
            onceRecurring: true,
            recurringType: 3,
            updatedAt: NOW,
        });
        const job = walletWrite("march", {
            amount: 0,
            amountText: null,
            date: charged.getTime(),
            dedupeKey: "notification:expense:march",
            note: "",
            text: "Paid $9.99 to Netflix",
        });

        await Effect.runPromise(applyPendingWrites(db, [job], charged));
        await Effect.runPromise(backfillRecurring(db, "sub-netflix", new Date(2026, 3, 5, 8, 0)));

        const rows = await db
            .select({ date: transactions.date, id: transactions.id })
            .from(transactions)
            .orderBy(transactions.date);
        expect(rows).toStrictEqual([
            { date: charged, id: "sub-netflix" },
            { date: new Date(2026, 3, 5, 18, 42), id: occurrenceId("sub-netflix", new Date(2026, 3, 5, 18, 42)) },
        ]);
    });

    it("adopts a subscription's new price and remembers the change once", async () => {
        const raise = walletWrite("raise", {
            amount: 0,
            amountText: null,
            dedupeKey: "notification:expense:raise",
            note: "",
            text: "Paid $12.99 to Netflix",
        });
        await db.insert(transactions).values({
            amount: 9.99,
            categoryId: "cat-expense",
            currency: DEFAULT_CURRENCY,
            date: NOW,
            day: NOW,
            id: "sub-netflix",
            income: false,
            month: NOW,
            note: "Netflix",
            onceRecurring: true,
            recurringType: 1,
            updatedAt: NOW,
        });

        await Effect.runPromise(applyPendingWrites(db, [raise], NOW));

        const [row] = await db
            .select({ amount: transactions.amount, amountUsd: transactions.amountUsd })
            .from(transactions)
            .where(eq(transactions.id, "sub-netflix"));
        expect(row).toStrictEqual({ amount: 12.99, amountUsd: null });
        await expect(Effect.runPromise(takeRepriced(db))).resolves.toStrictEqual([
            { currency: DEFAULT_CURRENCY, from: 9.99, note: "Netflix", to: 12.99 },
        ]);
        await expect(Effect.runPromise(takeRepriced(db))).resolves.toStrictEqual([]);
    });

    it("keeps the last few notification texts, read or not, once per delivery", async () => {
        const push = (id: string, text: string, date = NOW.getTime()) =>
            walletWrite(id, {
                amount: 0,
                amountText: null,
                date,
                dedupeKey: `notification:expense:${id}`,
                note: "",
                text,
            });
        const jobs = [
            push("statement", "Your statement is ready"),
            push("coffee", "You spent $6.40 at Blue Bottle"),
            push("coffee-again", "You spent $6.40 at Blue Bottle"),
            ...Array.from({ length: 5 }, (_, index) =>
                push(`n${index}`, `You spent $${index + 1}.00 at Shop ${index}`)
            ),
        ];

        await Effect.runPromise(applyPendingWrites(db, jobs, NOW));

        const texts = await Effect.runPromise(Meta.get(db, "notificationTexts"));
        expect(texts).toHaveLength(5);
        expect(texts.map((entry) => entry.amountText)).toStrictEqual(["$1.00", "$2.00", "$3.00", "$4.00", "$5.00"]);
    });

    it("files nothing for a notification that names no amount, and records its text", async () => {
        const { applied } = await Effect.runPromise(
            applyPendingWrites(
                db,
                [walletWrite("statement", { amount: 0, note: "", text: "Your statement is ready" })],
                NOW
            )
        );

        expect(applied).toBe(0);
        await expect(liveRows(db)).resolves.toHaveLength(0);
        await expect(Effect.runPromise(Meta.get(db, "notificationTexts"))).resolves.toStrictEqual([
            { amountText: null, at: NOW.getTime(), text: "Your statement is ready" },
        ]);
    });

    it("keeps two purchases far apart that were queued while the app was closed", async () => {
        const evening = NOW.getTime() + WALLET_DEDUPE_WINDOW_MS * 50;

        const { applied } = await Effect.runPromise(
            applyPendingWrites(
                db,
                [walletWrite("morning"), walletWrite("evening", { date: evening })],
                new Date(evening + 1)
            )
        );

        expect(applied).toBe(2);
        await expect(liveRows(db)).resolves.toHaveLength(2);
    });

    it("does not re-commit a replayed queue file", async () => {
        const job = walletWrite("replayed", { dedupeKey: null });

        await Effect.runPromise(applyPendingWrites(db, [job], NOW));
        const { applied } = await Effect.runPromise(applyPendingWrites(db, [job], NOW));

        expect(applied).toBe(0);
        await expect(liveRows(db)).resolves.toHaveLength(1);
    });

    it("lets a purchase the user deleted be logged again", async () => {
        await Effect.runPromise(applyPendingWrites(db, [walletWrite("auth")], NOW));
        const [row] = await liveRows(db);
        expect(row).toBeTruthy();
        await Effect.runPromise(transactionsRepo.remove(db, row.id, NOW));

        const { applied } = await Effect.runPromise(applyPendingWrites(db, [walletWrite("again")], NOW));

        expect(applied).toBe(1);
        const live = await db.select({ id: transactions.id }).from(transactions).where(eq(transactions.deletedAt, NOW));
        expect(live).toHaveLength(1);
        await expect(liveRows(db)).resolves.toHaveLength(2);
    });

    it("files a merchant where it was filed last time", async () => {
        await db.insert(categories).values({
            id: "cat-eating-out",
            income: false,
            name: "Eating out",
            sortOrder: 1,
            updatedAt: NOW,
        });
        await db.insert(transactions).values({
            amount: 5,
            categoryId: "cat-eating-out",
            date: NOW,
            day: NOW,
            id: "old",
            income: false,
            month: NOW,
            note: "Blue Bottle",
            updatedAt: NOW,
        });

        await Effect.runPromise(applyPendingWrites(db, [walletWrite("a")], NOW));

        const [row] = await db
            .select({ categoryId: transactions.categoryId })
            .from(transactions)
            .where(ne(transactions.id, "old"));
        expect(row?.categoryId).toBe("cat-eating-out");
    });

    it("files a card's waiting and later purchases under the account picked for it", async () => {
        await seedAccounts(db);
        await Effect.runPromise(
            applyPendingWrites(db, [walletWrite("a", { card: "Binance Card", currency: "USD", dedupeKey: null })], NOW)
        );
        await Effect.runPromise(pickCardAccount(db, "Binance Card", "acc-n26"));
        await Effect.runPromise(
            applyPendingWrites(db, [walletWrite("b", { card: "Binance Card", dedupeKey: null })], NOW)
        );

        const rows = await db.select({ accountId: transactions.accountId }).from(transactions);
        expect(rows.map((row) => String(row.accountId))).toStrictEqual(["acc-n26", "acc-n26"]);
    });

    it("keeps the account given by hand to a purchase that waited on its card", async () => {
        await seedAccounts(db);
        await Effect.runPromise(
            applyPendingWrites(db, [walletWrite("a", { card: "Binance Card", currency: "USD", dedupeKey: null })], NOW)
        );
        await db.update(transactions).set({ accountId: "acc-chase" });
        await Effect.runPromise(pickCardAccount(db, "Binance Card", "acc-n26"));

        const [row] = await db.select({ accountId: transactions.accountId }).from(transactions);
        expect(row?.accountId).toBe("acc-chase");
    });

    it("keeps a card's waiting purchases through a No account or gone-account pick", async () => {
        await seedAccounts(db);
        await Effect.runPromise(
            applyPendingWrites(db, [walletWrite("a", { card: "Binance Card", currency: "USD", dedupeKey: null })], NOW)
        );
        await Effect.runPromise(pickCardAccount(db, "Binance Card", "acc-deleted"));
        await Effect.runPromise(pickCardAccount(db, "Binance Card", null));
        await Effect.runPromise(pickCardAccount(db, "Binance Card", "acc-n26"));

        const [row] = await db.select({ accountId: transactions.accountId }).from(transactions);
        expect(row?.accountId).toBe("acc-n26");
    });

    it("files a card's waiting purchases once the card matches an account by name", async () => {
        await seedAccounts(db);
        await Effect.runPromise(
            applyPendingWrites(db, [walletWrite("a", { card: "Binance Card", currency: "USD", dedupeKey: null })], NOW)
        );
        await db.insert(accounts).values({
            currency: "USD",
            dateCreated: NOW,
            id: "acc-binance",
            initialBalanceDate: NOW,
            name: "Binance",
            updatedAt: NOW,
        });
        await Effect.runPromise(fileWaitingPurchases(db));

        const [row] = await db.select({ accountId: transactions.accountId }).from(transactions);
        expect(row?.accountId).toBe("acc-binance");
    });

    it("leaves a waiting purchase that predates the account's opening balance", async () => {
        await seedAccounts(db);
        await Effect.runPromise(
            applyPendingWrites(db, [walletWrite("a", { card: "Binance Card", currency: "USD", dedupeKey: null })], NOW)
        );
        await db.insert(accounts).values({
            currency: "USD",
            dateCreated: NOW,
            id: "acc-binance",
            initialBalanceDate: new Date(NOW.getTime() + 60 * 60 * 1000),
            name: "Binance",
            updatedAt: NOW,
        });
        await Effect.runPromise(fileWaitingPurchases(db));

        const [row] = await db.select({ accountId: transactions.accountId }).from(transactions);
        expect(row?.accountId).toBeNull();
    });

    it("files a waiting purchase restored after its card got the account", async () => {
        await seedAccounts(db);
        await Effect.runPromise(
            applyPendingWrites(db, [walletWrite("a", { card: "Binance Card", currency: "USD", dedupeKey: null })], NOW)
        );
        const [queued] = await db.select({ id: transactions.id }).from(transactions);
        await Effect.runPromise(transactionsRepo.remove(db, queued?.id ?? ""));
        await Effect.runPromise(pickCardAccount(db, "Binance Card", "acc-n26"));
        await Effect.runPromise(transactionsRepo.restore(db, queued?.id ?? ""));
        await Effect.runPromise(fileWaitingPurchases(db));

        const [row] = await db.select({ accountId: transactions.accountId }).from(transactions);
        expect(row?.accountId).toBe("acc-n26");
    });

    it("does not stretch the dedupe window from a skipped duplicate", async () => {
        const minute = 60 * 1000;
        await Effect.runPromise(
            applyPendingWrites(
                db,
                [
                    walletWrite("a"),
                    walletWrite("b", { date: NOW.getTime() + 9 * minute }),
                    walletWrite("c", { date: NOW.getTime() + 18 * minute }),
                ],
                NOW
            )
        );

        await expect(db.select().from(transactions)).resolves.toHaveLength(2);
    });

    it("points a skipped duplicate's enqueue at the row its purchase landed in", async () => {
        await Effect.runPromise(applyPendingWrites(db, [walletWrite("a"), walletWrite("b")], NOW));

        const rows = await db.select({ id: transactions.id }).from(transactions);
        expect(rows).toHaveLength(1);
        await expect(Effect.runPromise(pendingWriteTxId(db, "b"))).resolves.toBe(rows[0]?.id);
    });

    it("leaves a card unattached when No account was picked over its name match", async () => {
        await seedAccounts(db);
        await Effect.runPromise(
            applyPendingWrites(db, [walletWrite("a", { card: "Chase Sapphire", dedupeKey: null })], NOW)
        );
        await Effect.runPromise(pickCardAccount(db, "Chase Sapphire", null));
        await Effect.runPromise(
            applyPendingWrites(db, [walletWrite("b", { card: "Chase Sapphire", dedupeKey: null })], NOW)
        );

        const rows = await db.select({ accountId: transactions.accountId }).from(transactions);
        expect(rows.map((row) => String(row.accountId)).toSorted()).toStrictEqual(["acc-chase", "null"]);
    });

    it("leaves an unseen merchant's category to the merchant lookup", async () => {
        await Effect.runPromise(applyPendingWrites(db, [walletWrite("a")], NOW));

        const [row] = await db.select({ categoryId: transactions.categoryId, id: transactions.id }).from(transactions);
        expect(row?.categoryId).toBeNull();
        await expect(Effect.runPromise(Meta.get(db, "enrichmentOutbox"))).resolves.toStrictEqual([row?.id]);
    });

    it("files an unseen merchant under the first category until the AI providers are allowed", async () => {
        await Effect.runPromise(Meta.set(db, "aiConsentV2", false));

        await Effect.runPromise(applyPendingWrites(db, [walletWrite("a")], NOW));

        const [row] = await db.select({ categoryId: transactions.categoryId }).from(transactions);
        expect(row?.categoryId).toBe("cat-expense");
        await expect(Effect.runPromise(Meta.get(db, "enrichmentOutbox"))).resolves.toStrictEqual([]);
    });

    it("files an unseen merchant under the first category when lookups are off", async () => {
        await Effect.runPromise(Meta.set(db, "aiEnrichment", false));

        await Effect.runPromise(applyPendingWrites(db, [walletWrite("a")], NOW));

        const [row] = await db.select({ categoryId: transactions.categoryId }).from(transactions);
        expect(row?.categoryId).toBe("cat-expense");
        await expect(Effect.runPromise(Meta.get(db, "enrichmentOutbox"))).resolves.toStrictEqual([]);
    });

    it("does not re-write a replayed job again after the first replay landed", async () => {
        const job = walletWrite("j1");
        await Effect.runPromise(applyPendingWrites(db, [job], NOW));
        const [first] = await liveRows(db);

        await Effect.runPromise(transactionsRepo.remove(db, first?.id ?? "", NOW));
        const replay = new Date(NOW.getTime() + WALLET_DEDUPE_WINDOW_MS + 1);
        await Effect.runPromise(applyPendingWrites(db, [job], replay));
        await expect(undeleted(db)).resolves.toHaveLength(1);

        const later = new Date(replay.getTime() + WALLET_DEDUPE_WINDOW_MS + 1);
        await Effect.runPromise(applyPendingWrites(db, [job], later));
        await Effect.runPromise(applyPendingWrites(db, [job], new Date(later.getTime() + WALLET_DEDUPE_WINDOW_MS + 1)));

        await expect(undeleted(db)).resolves.toHaveLength(1);
    });
});

describe("drainPendingWrites", () => {
    let db: Database;

    beforeEach(async () => {
        db = makeDb();
        await seedCategories(db);
    });

    it("applies a job once when two drains overlap", async () => {
        const job = walletWrite("wallet-1");
        let released = 0;
        const claim = () => (released === 0 ? { jobs: [job], names: ["claimed-1.jsonl"] } : { jobs: [], names: [] });
        const release = () => {
            released += 1;
        };

        // Both catch-up paths at once: the effect body at mount, and the first AppState "active" just after.
        const [first, second] = await Promise.all([
            Effect.runPromise(drainPendingWrites(db, claim, release)),
            Effect.runPromise(drainPendingWrites(db, claim, release)),
        ]);

        await expect(db.select().from(transactions)).resolves.toHaveLength(1);
        expect(first).toStrictEqual({ applied: 1, autologged: 1 });
        expect(second).toStrictEqual(first);
        expect(released).toBe(1);
    });

    it("writes what the AI read from a push, and nothing for a push it reads as declined", async () => {
        const push = (id: string, text: string) =>
            walletWrite(id, { amount: 0, amountText: null, dedupeKey: `notification:expense:${id}`, note: "", text });
        const jobs = [
            push(
                "site",
                "Your transaction was successful\nPayment of USD 22.99 approved on the card ending with 7909."
            ),
            push("held", "Card alert\nA $40.00 charge at Hotel Sol could not be completed."),
        ];
        const claim = () => ({ jobs, names: ["claimed-1.jsonl"] });
        const reader = () =>
            Effect.succeed(
                new Map([
                    ["site", { amount: 22.99, currency: "USD", kind: "purchase" as const, merchant: "SiteGround" }],
                    ["held", { amount: 40, currency: "USD", kind: "declined" as const, merchant: "Hotel Sol" }],
                ])
            );

        await Effect.runPromise(drainPendingWrites(db, claim, () => undefined, reader));

        await expect(
            db
                .select({ amount: transactions.amount, currency: transactions.currency, note: transactions.note })
                .from(transactions)
        ).resolves.toStrictEqual([{ amount: 22.99, currency: "USD", note: "SiteGround" }]);
    });

    it("runs another pass for a drain that arrives mid-pass", async () => {
        const claim = vi
            .fn<() => { jobs: PendingWrite[]; names: string[] }>()
            .mockReturnValueOnce({ jobs: [walletWrite("wallet-1")], names: ["a.jsonl"] })
            .mockReturnValueOnce({
                jobs: [walletWrite("wallet-2", { dedupeKey: "wallet:expense:other:100" })],
                names: ["b.jsonl"],
            })
            .mockReturnValue({ jobs: [], names: [] });

        await Promise.all([
            Effect.runPromise(drainPendingWrites(db, claim, () => undefined)),
            Effect.runPromise(drainPendingWrites(db, claim, () => undefined)),
        ]);

        await expect(db.select().from(transactions)).resolves.toHaveLength(2);
    });

    it("drains again once the first pass has finished", async () => {
        const claim = vi
            .fn<() => { jobs: PendingWrite[]; names: string[] }>()
            .mockReturnValueOnce({ jobs: [walletWrite("wallet-1")], names: ["a.jsonl"] })
            .mockReturnValueOnce({
                jobs: [walletWrite("wallet-2", { dedupeKey: "wallet:expense:other:100" })],
                names: ["b.jsonl"],
            });

        await Effect.runPromise(drainPendingWrites(db, claim, () => undefined));
        await Effect.runPromise(drainPendingWrites(db, claim, () => undefined));

        await expect(db.select().from(transactions)).resolves.toHaveLength(2);
    });
});

test("adds the card's usual fee to a foreign Wallet charge, inside the queue's own transaction", async () => {
    const db = transactionalDatabase();
    await seedCategories(db);
    await seedAccounts(db);
    await Effect.runPromise(
        transactionsRepo.create(db, {
            accountId: "acc-n26",
            amount: 10,
            categoryId: "cat-expense",
            currency: "USD",
            date: new Date("2026-03-01T09:00:00Z"),
            details: null,
            fee: { amount: null, categoryId: "cat-expense", currency: "EUR", note: "Fee · Grok", rate: 0.035 },
            income: false,
            note: "Grok",
        })
    );

    await Effect.runPromise(
        applyPendingWrites(db, [walletWrite("a", { amountText: "$6.40", card: "N26", currency: "USD" })], NOW)
    );

    const [charge] = await db.select().from(transactions).where(eq(transactions.note, "Blue Bottle"));
    expect(cardFeeFor(db, charge?.id ?? "")).toMatchObject({ currency: "EUR", feeRate: 0.035 });
});

test("adds the card's usual fee when a foreign charge that waited on its card gets the account", async () => {
    const db = transactionalDatabase();
    await seedCategories(db);
    await seedAccounts(db);
    await Effect.runPromise(
        transactionsRepo.create(db, {
            accountId: "acc-n26",
            amount: 10,
            categoryId: "cat-expense",
            currency: "USD",
            date: new Date("2026-03-01T09:00:00Z"),
            details: null,
            fee: { amount: null, categoryId: "cat-expense", currency: "EUR", note: "Fee · Grok", rate: 0.035 },
            income: false,
            note: "Grok",
        })
    );
    await Effect.runPromise(
        applyPendingWrites(db, [walletWrite("a", { amountText: "$6.40", card: "Work card", currency: "USD" })], NOW)
    );

    await Effect.runPromise(pickCardAccount(db, "Work card", "acc-n26"));

    const [charge] = await db.select().from(transactions).where(eq(transactions.note, "Blue Bottle"));
    expect(charge?.accountId).toBe("acc-n26");
    expect(cardFeeFor(db, charge?.id ?? "")).toMatchObject({ accountId: "acc-n26", currency: "EUR", feeRate: 0.035 });
});

test("keeps a fee typed on a waiting charge when its card gets the account", async () => {
    const db = transactionalDatabase();
    await seedCategories(db);
    await seedAccounts(db);
    await Effect.runPromise(
        transactionsRepo.create(db, {
            accountId: "acc-n26",
            amount: 10,
            categoryId: "cat-expense",
            currency: "USD",
            date: new Date("2026-03-01T09:00:00Z"),
            details: null,
            fee: { amount: null, categoryId: "cat-expense", currency: "EUR", note: "Fee · Grok", rate: 0.035 },
            income: false,
            note: "Grok",
        })
    );
    await Effect.runPromise(
        applyPendingWrites(db, [walletWrite("a", { amountText: "$6.40", card: "Work card", currency: "USD" })], NOW)
    );
    const [charge] = await db.select().from(transactions).where(eq(transactions.note, "Blue Bottle"));
    await db.insert(transactions).values({
        amount: 1.5,
        categoryId: "cat-expense",
        currency: "USD",
        date: NOW,
        day: charge?.day ?? NOW,
        feeForId: charge?.id ?? "",
        id: "typed-fee",
        income: false,
        month: charge?.month ?? NOW,
        note: "Fee · Blue Bottle",
        updatedAt: NOW,
    });

    await Effect.runPromise(pickCardAccount(db, "Work card", "acc-n26"));

    expect(cardFeeFor(db, charge?.id ?? "")).toMatchObject({ accountId: "acc-n26", amount: 1.5, id: "typed-fee" });
});

describe("appliedWriteIds", () => {
    it("lists only the writes applied since the given instant", async () => {
        const db = makeDb();
        await seedCategories(db);
        const watchWrite = (id: string, date: number): PendingWrite => ({
            amount: 4.5,
            category: "Coffee",
            categoryId: "cat-expense",
            date,
            id,
            income: false,
            note: "",
        });
        const later = new Date(NOW.getTime() + 2 * 86_400_000);

        await Effect.runPromise(applyPendingWrites(db, [watchWrite("old", NOW.getTime())], NOW));
        await Effect.runPromise(applyPendingWrites(db, [watchWrite("new", later.getTime())], later));

        await expect(Effect.runPromise(appliedWriteIds(db, later.getTime() - 86_400_000))).resolves.toStrictEqual([
            "new",
        ]);
    });
});

describe("the free auto-log cap", () => {
    let db: Database;

    const fullMonth = () => {
        let usage: AutologUsage = {};
        for (let entry = 0; entry < 30; entry += 1) {
            usage = withAutologEntry(usage, NOW.getTime(), "applied");
        }
        return usage;
    };

    const fare = (id: string, note: string, hoursLater: number) =>
        walletWrite(id, {
            date: NOW.getTime() + hoursLater * HOUR,
            dedupeKey: `wallet:expense:${note.toLowerCase()}:640`,
            note,
        });

    beforeEach(async () => {
        db = makeDb();
        await seedCategories(db);
        await Effect.runPromise(writeAutologAccess(db, "free"));
        await Effect.runPromise(Meta.set(db, "autologUsage", fullMonth()));
    });

    it("holds a wallet entry over the cap whole, and still takes one the user made on purpose", async () => {
        const held = fare("w1", "Blue Bottle", 0);
        const shortcut = walletWrite("s1", { dedupeKey: null, note: "Kiosk" });

        await Effect.runPromise(applyPendingWrites(db, [held, shortcut], NOW));

        expect((await liveRows(db)).map((row) => row.note)).toStrictEqual(["Kiosk"]);
        await expect(Effect.runPromise(readAutologWaiting(db))).resolves.toStrictEqual([held]);
    });

    it("holds a replayed entry once", async () => {
        const held = fare("w1", "Blue Bottle", 0);

        await Effect.runPromise(applyPendingWrites(db, [held], NOW));
        await Effect.runPromise(applyPendingWrites(db, [held], NOW));

        await expect(Effect.runPromise(readAutologWaiting(db))).resolves.toHaveLength(1);
    });

    it("applies what waited, oldest first and marked new, once the customer is Pro", async () => {
        await Effect.runPromise(
            applyPendingWrites(db, [fare("w1", "Blue Bottle", 0), fare("w2", "Philz", 1), fare("w3", "Verve", 2)], NOW)
        );
        await Effect.runPromise(writeAutologAccess(db, "open"));

        await Effect.runPromise(
            drainPendingWrites(
                db,
                () => ({ jobs: [], names: [] }),
                () => undefined
            )
        );

        const rows = await db
            .select({ note: transactions.note, unreviewed: transactions.unreviewed })
            .from(transactions)
            .orderBy(sql`rowid`);
        expect(rows).toStrictEqual([
            { note: "Blue Bottle", unreviewed: true },
            { note: "Philz", unreviewed: true },
            { note: "Verve", unreviewed: true },
        ]);
        await expect(Effect.runPromise(readAutologWaiting(db))).resolves.toStrictEqual([]);
    });

    it("counts only the entries that arrive fresh as auto-logged, not the ones a Pro unlock releases", async () => {
        await Effect.runPromise(applyPendingWrites(db, [fare("w1", "Blue Bottle", 0)], NOW));
        await Effect.runPromise(writeAutologAccess(db, "open"));
        const nothingClaimed = () => ({ jobs: [], names: [] });
        const fresh = fare("w2", "Philz", 1);
        const claimsFresh = () => ({ jobs: [fresh], names: ["claimed-1.jsonl"] });

        const pending = () => Effect.runPromise(Meta.get(db, "reviewPending"));

        const released = await Effect.runPromise(drainPendingWrites(db, nothingClaimed, () => undefined));
        expect(released).toStrictEqual({ applied: 1, autologged: 0 });
        await expect(pending()).resolves.toBe(false);

        const arrived = await Effect.runPromise(drainPendingWrites(db, claimsFresh, () => undefined));
        expect(arrived).toStrictEqual({ applied: 1, autologged: 1 });
        await expect(pending()).resolves.toBe(true);
    });

    it("leaves what waited alone while the customer is free", async () => {
        await Effect.runPromise(applyPendingWrites(db, [fare("w1", "Blue Bottle", 0)], NOW));

        await Effect.runPromise(
            drainPendingWrites(
                db,
                () => ({ jobs: [], names: [] }),
                () => undefined
            )
        );

        await expect(Effect.runPromise(readAutologWaiting(db))).resolves.toHaveLength(1);
        await expect(liveRows(db)).resolves.toStrictEqual([]);
    });
});
