import { beforeEach, describe, expect, it, jest, test } from "@jest/globals";
import { eq, isNull, ne } from "drizzle-orm";

import type { Database } from "@/db/client";
import { accounts, categories, transactions } from "@/db/schema";
import { migratedDatabase, transactionalDatabase } from "@/db/test-database";
import { DEFAULT_CURRENCY } from "@/domain/money";
import type { PendingWrite } from "@/lib/pending-writes-core";

import { getMeta, META_KEYS } from "./app-meta-core";
import { cardFeeFor } from "./card-fees-core";
import {
    appliedWriteIds,
    applyPendingWrites,
    drainPendingWrites,
    fileWaitingPurchases,
    parseLastWalletEntry,
    parseNotificationTexts,
    parseWalletCards,
    pendingWriteTxId,
    takeRepriced,
    pickCardAccount,
    WALLET_DEDUPE_WINDOW_MS,
} from "./pending-writes-core";
import { backfillRecurring, occurrenceId } from "./recurrence-backfill";
import { setBoolSetting } from "./settings-core";
import { transactionsRepo } from "./transactions-core";

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

function busFare(id: string, hoursLater: number, card = "Payoneer"): PendingWrite {
    return walletWrite(id, {
        amount: 0,
        amountText: null,
        card,
        date: NOW.getTime() + hoursLater * HOUR,
        dedupeKey: "notification:expense:a charge of 1.86 usd (transportes rober s a)",
        note: "",
        text: "USD card charge\nA charge of 1.86 USD was made to your Payoneer USD card XXXX-3111 (TRANSPORTES ROBER S A)",
    });
}

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
        await setBoolSetting(db, "aiConsentV2", true);
    });

    it("files a bank app's push under its account in the charge's currency", async () => {
        await db.insert(accounts).values(
            ["USD", "EUR"].map((currency) => ({
                currency,
                dateCreated: NOW,
                id: `acc-payoneer-${currency}`,
                initialBalanceDate: NOW,
                name: `Payoneer (${currency})`,
                updatedAt: NOW,
            }))
        );
        const push = (id: string, amount: string) =>
            walletWrite(id, {
                amount: 0,
                amountText: null,
                card: "Payoneer",
                dedupeKey: `notification:expense:${id}`,
                note: "",
                text: `${amount.split(" ")[1]} card charge\nA charge of ${amount} was made to your Payoneer card XXXX-3111 (ANDALUCIA A PIE)`,
            });

        await applyPendingWrites(db, [push("usd", "11.63 USD"), push("eur", "9.40 EUR")], NOW);

        const rows = await db
            .select({ accountId: transactions.accountId, currency: transactions.currency })
            .from(transactions);
        expect(rows).toStrictEqual([
            { accountId: "acc-payoneer-USD", currency: "USD" },
            { accountId: "acc-payoneer-EUR", currency: "EUR" },
        ]);
    });

    it("files a Venezuelan bank's Bs. push in bolívares, not Bolivian bolivianos", async () => {
        await db.insert(accounts).values({
            currency: "VES",
            dateCreated: NOW,
            id: "acc-banesco",
            initialBalanceDate: NOW,
            name: "Banesco",
            updatedAt: NOW,
        });
        const push = walletWrite("bs", {
            amount: 0,
            amountText: null,
            card: "Banesco",
            dedupeKey: "notification:expense:bs",
            note: "",
            text: "Compra aprobada\nCompra por Bs. 4.150,50 en Panadería Sol con tu tarjeta terminada en 1234",
        });

        await applyPendingWrites(db, [push], NOW);

        const [row] = await db
            .select({ accountId: transactions.accountId, amount: transactions.amount, currency: transactions.currency })
            .from(transactions);
        expect(row).toStrictEqual({ accountId: "acc-banesco", amount: 4150.5, currency: "VES" });
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

        const applied = await applyPendingWrites(db, [job], NOW);

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

    it("marks the last entry as a push only when a notification logged it", async () => {
        const push = walletWrite("push", {
            amount: 0,
            amountText: null,
            dedupeKey: "notification:expense:x",
            note: "",
            text: "You paid $12.40 at STARBUCKS",
        });

        await applyPendingWrites(db, [push], NOW);
        expect(parseLastWalletEntry(await getMeta(db, META_KEYS.lastWalletEntry))?.push).toBe(true);

        await applyPendingWrites(db, [walletWrite("tap")], NOW);
        expect(parseLastWalletEntry(await getMeta(db, META_KEYS.lastWalletEntry))?.push).toBeUndefined();
    });

    it("files a refund push as income", async () => {
        const job = walletWrite("refund", {
            amount: 0,
            amountText: null,
            dedupeKey: "notification:expense:refund",
            note: "",
            text: "Refund of $12.40 from STARBUCKS",
        });

        await applyPendingWrites(db, [job], NOW);

        const [row] = await db
            .select({ categoryId: transactions.categoryId, income: transactions.income, note: transactions.note })
            .from(transactions);
        expect(row).toStrictEqual({ categoryId: null, income: true, note: "STARBUCKS" });
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

        await applyPendingWrites(db, [tap, push], NOW);

        const rows = await db.select({ amount: transactions.amount, id: transactions.id }).from(transactions);
        expect(rows).toStrictEqual([{ amount: 22.6, id: rows[0]?.id }]);
        await expect(pendingWriteTxId(db, "push")).resolves.toBe(rows[0]?.id);
        expect(parseWalletCards(await getMeta(db, META_KEYS.walletCards)).map((card) => card.text)).toContain(
            "Payoneer"
        );
    });

    it("keeps a bank push in the tap's currency whose amount differs", async () => {
        const push = walletWrite("push", {
            amount: 0,
            amountText: null,
            card: "Payoneer",
            dedupeKey: "notification:expense:payoneer",
            note: "",
            text: "You paid $50.00 at Blue Bottle",
        });

        await applyPendingWrites(db, [walletWrite("tap", { card: "Visa" }), push], NOW);

        await expect(undeleted(db)).resolves.toHaveLength(2);
    });

    it("keeps a second push from the same app as its own purchase", async () => {
        const push = (id: string) =>
            walletWrite(id, {
                amount: 0,
                amountText: null,
                card: "Payoneer",
                dedupeKey: `notification:expense:${id}`,
                note: "",
                text: `You paid $6.40 at Blue Bottle (${id})`,
            });

        await applyPendingWrites(db, [walletWrite("tap", { card: "Visa" }), push("first"), push("second")], NOW);

        await expect(undeleted(db)).resolves.toHaveLength(2);
    });

    it("folds Payoneer's settle push into the row its authorize push made", async () => {
        await applyPendingWrites(db, [busFare("auth", 0)], NOW);

        const applied = await applyPendingWrites(db, [busFare("settle", 20)], NOW);

        expect(applied).toBe(0);
        await expect(undeleted(db)).resolves.toHaveLength(1);
    });

    it("keeps every fare when the same Payoneer charge happens twice before either settles", async () => {
        await applyPendingWrites(
            db,
            [busFare("ride-1", 0), busFare("ride-2", 10), busFare("settle-1", 24), busFare("settle-2", 34)],
            NOW
        );

        await expect(undeleted(db)).resolves.toHaveLength(2);
    });

    it("does not bring back an authorized charge the user deleted", async () => {
        await applyPendingWrites(db, [busFare("auth", 0)], NOW);
        const [row] = await liveRows(db);
        await transactionsRepo.remove(db, row?.id ?? "", NOW);

        await applyPendingWrites(db, [busFare("settle", 20)], NOW);

        await expect(undeleted(db)).resolves.toHaveLength(0);
    });

    it("keeps a repeated push from another bank as its own purchase", async () => {
        await applyPendingWrites(db, [busFare("first", 0, "Revolut"), busFare("again", 20, "Revolut")], NOW);

        await expect(undeleted(db)).resolves.toHaveLength(2);
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

        await applyPendingWrites(db, [walletWrite("tap", { amountText: "€6.40", card: "Visa 1234" }), push], NOW);

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

        await applyPendingWrites(db, [push("october")], NOW);

        await expect(liveRows(db)).resolves.toStrictEqual([{ id: "sub-netflix", note: "Netflix" }]);
        expect(parseLastWalletEntry(await getMeta(db, META_KEYS.lastWalletEntry))?.txId).toBe("sub-netflix");

        await applyPendingWrites(db, [push("again")], NOW);

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

        await applyPendingWrites(db, [job], NOW);

        const rows = await db
            .select({ amount: transactions.amount, id: transactions.id, recurringType: transactions.recurringType })
            .from(transactions)
            .where(isNull(transactions.deletedAt));
        expect(rows).toHaveLength(2);
        const occurrence = rows.find((row) => row.id !== "sub-netflix");
        expect(occurrence).toMatchObject({ amount: 12.99, recurringType: 3 });
        expect(parseLastWalletEntry(await getMeta(db, META_KEYS.lastWalletEntry))?.txId).toBe(occurrence?.id);
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

        await applyPendingWrites(db, [job], charged);
        await backfillRecurring(db, "sub-netflix", new Date(2026, 3, 5, 8, 0));

        const rows = await db
            .select({ date: transactions.date, id: transactions.id })
            .from(transactions)
            .orderBy(transactions.date);
        expect(rows).toStrictEqual([
            { date: charged, id: "sub-netflix" },
            { date: new Date(2026, 3, 5, 18, 42), id: occurrenceId("sub-netflix", new Date(2026, 3, 5, 18, 42)) },
        ]);
    });

    it("adopts a subscription's new price by name within the band, and not a one-off", async () => {
        const push = (id: string, text: string) =>
            walletWrite(id, {
                amount: 0,
                amountText: null,
                dedupeKey: `notification:expense:${id}`,
                note: "",
                text,
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

        await applyPendingWrites(db, [push("raise", "Paid $12.99 to Netflix")], NOW);

        const [row] = await db
            .select({ amount: transactions.amount, amountUsd: transactions.amountUsd })
            .from(transactions)
            .where(eq(transactions.id, "sub-netflix"));
        expect(row).toStrictEqual({ amount: 12.99, amountUsd: null });
        await expect(takeRepriced(db)).resolves.toStrictEqual([
            { currency: DEFAULT_CURRENCY, from: 9.99, note: "Netflix", to: 12.99 },
        ]);
        await expect(takeRepriced(db)).resolves.toStrictEqual([]);

        await applyPendingWrites(db, [push("gift", "Paid $120.00 to Netflix")], NOW);

        await expect(liveRows(db)).resolves.toHaveLength(2);
    });

    it("skips a notification that names no amount", async () => {
        const job = walletWrite("statement", { amount: 0, note: "", text: "Your statement is ready" });

        const applied = await applyPendingWrites(db, [job], NOW);

        expect(applied).toBe(0);
        await expect(liveRows(db)).resolves.toHaveLength(0);
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

        await applyPendingWrites(db, jobs, NOW);

        const texts = parseNotificationTexts(await getMeta(db, META_KEYS.notificationTexts));
        expect(texts).toHaveLength(5);
        expect(texts.map((entry) => entry.amountText)).toStrictEqual(["$1.00", "$2.00", "$3.00", "$4.00", "$5.00"]);
    });

    it("records an unreadable notification without an amount", async () => {
        await applyPendingWrites(
            db,
            [walletWrite("statement", { amount: 0, note: "", text: "Your statement is ready" })],
            NOW
        );

        expect(parseNotificationTexts(await getMeta(db, META_KEYS.notificationTexts))).toStrictEqual([
            { amountText: null, at: NOW.getTime(), text: "Your statement is ready" },
        ]);
    });

    it("collapses the authorize and settle runs of one purchase", async () => {
        await applyPendingWrites(db, [walletWrite("auth")], NOW);
        const settled = NOW.getTime() + WALLET_DEDUPE_WINDOW_MS - 1;

        const applied = await applyPendingWrites(
            db,
            [walletWrite("settle", { date: settled })],
            new Date(settled + WALLET_DEDUPE_WINDOW_MS * 30)
        );

        expect(applied).toBe(0);
        await expect(liveRows(db)).resolves.toHaveLength(1);
    });

    it("keeps the same purchase made again past the window", async () => {
        await applyPendingWrites(db, [walletWrite("morning")], NOW);
        const later = NOW.getTime() + WALLET_DEDUPE_WINDOW_MS + 1;

        const applied = await applyPendingWrites(db, [walletWrite("noon", { date: later })], new Date(later));

        expect(applied).toBe(1);
        await expect(liveRows(db)).resolves.toHaveLength(2);
    });

    it("keeps two purchases far apart that were queued while the app was closed", async () => {
        const evening = NOW.getTime() + WALLET_DEDUPE_WINDOW_MS * 50;

        const applied = await applyPendingWrites(
            db,
            [walletWrite("morning"), walletWrite("evening", { date: evening })],
            new Date(evening + 1)
        );

        expect(applied).toBe(2);
        await expect(liveRows(db)).resolves.toHaveLength(2);
    });

    it("keeps two purchases the automation could tell apart", async () => {
        await applyPendingWrites(db, [walletWrite("a")], NOW);

        const applied = await applyPendingWrites(db, [walletWrite("b", { dedupeKey: "wallet:id:txn-99" })], NOW);

        expect(applied).toBe(1);
        await expect(liveRows(db)).resolves.toHaveLength(2);
    });

    it("does not re-commit a replayed queue file", async () => {
        const job = walletWrite("replayed", { dedupeKey: null });

        await applyPendingWrites(db, [job], NOW);
        const applied = await applyPendingWrites(db, [job], NOW);

        expect(applied).toBe(0);
        await expect(liveRows(db)).resolves.toHaveLength(1);
    });

    it("does not re-commit a replayed file whose purchase key has aged out", async () => {
        const job = walletWrite("replayed");
        await applyPendingWrites(db, [job], NOW);
        const late = new Date(NOW.getTime() + WALLET_DEDUPE_WINDOW_MS * 3);

        const applied = await applyPendingWrites(db, [job], late);

        expect(applied).toBe(0);
        await expect(liveRows(db)).resolves.toHaveLength(1);
    });

    it("lets a purchase the user deleted be logged again", async () => {
        await applyPendingWrites(db, [walletWrite("auth")], NOW);
        const [row] = await liveRows(db);
        expect(row).toBeTruthy();
        await transactionsRepo.remove(db, row.id, NOW);

        const applied = await applyPendingWrites(db, [walletWrite("again")], NOW);

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

        await applyPendingWrites(db, [walletWrite("a")], NOW);

        const [row] = await db
            .select({ categoryId: transactions.categoryId })
            .from(transactions)
            .where(ne(transactions.id, "old"));
        expect(row?.categoryId).toBe("cat-eating-out");
    });

    it("files a Wallet purchase under the account its card matches", async () => {
        await seedAccounts(db);
        await applyPendingWrites(db, [walletWrite("a", { card: "Chase Sapphire Reserve" })], NOW);
        const [row] = await db.select({ accountId: transactions.accountId }).from(transactions);
        expect(row?.accountId).toBe("acc-chase");
    });

    it("leaves a purchase unattached when the card matches no account", async () => {
        await seedAccounts(db);
        await applyPendingWrites(db, [walletWrite("a", { card: "Apple Card" })], NOW);
        const [row] = await db.select({ accountId: transactions.accountId }).from(transactions);
        expect(row?.accountId).toBeNull();
    });

    it("files a card's waiting and later purchases under the account picked for it", async () => {
        await seedAccounts(db);
        await applyPendingWrites(
            db,
            [walletWrite("a", { card: "Binance Card", currency: "USD", dedupeKey: null })],
            NOW
        );
        await pickCardAccount(db, "Binance Card", "acc-n26");
        await applyPendingWrites(db, [walletWrite("b", { card: "Binance Card", dedupeKey: null })], NOW);

        const rows = await db.select({ accountId: transactions.accountId }).from(transactions);
        expect(rows.map((row) => String(row.accountId))).toStrictEqual(["acc-n26", "acc-n26"]);
    });

    it("keeps the account given by hand to a purchase that waited on its card", async () => {
        await seedAccounts(db);
        await applyPendingWrites(
            db,
            [walletWrite("a", { card: "Binance Card", currency: "USD", dedupeKey: null })],
            NOW
        );
        await db.update(transactions).set({ accountId: "acc-chase" });
        await pickCardAccount(db, "Binance Card", "acc-n26");

        const [row] = await db.select({ accountId: transactions.accountId }).from(transactions);
        expect(row?.accountId).toBe("acc-chase");
    });

    it("keeps a card's waiting purchases through a No account or gone-account pick", async () => {
        await seedAccounts(db);
        await applyPendingWrites(
            db,
            [walletWrite("a", { card: "Binance Card", currency: "USD", dedupeKey: null })],
            NOW
        );
        await pickCardAccount(db, "Binance Card", "acc-deleted");
        await pickCardAccount(db, "Binance Card", null);
        await pickCardAccount(db, "Binance Card", "acc-n26");

        const [row] = await db.select({ accountId: transactions.accountId }).from(transactions);
        expect(row?.accountId).toBe("acc-n26");
    });

    it("files a card's waiting purchases once the card matches an account by name", async () => {
        await seedAccounts(db);
        await applyPendingWrites(
            db,
            [walletWrite("a", { card: "Binance Card", currency: "USD", dedupeKey: null })],
            NOW
        );
        await db.insert(accounts).values({
            currency: "USD",
            dateCreated: NOW,
            id: "acc-binance",
            initialBalanceDate: NOW,
            name: "Binance",
            updatedAt: NOW,
        });
        await fileWaitingPurchases(db);

        const [row] = await db.select({ accountId: transactions.accountId }).from(transactions);
        expect(row?.accountId).toBe("acc-binance");
    });

    it("leaves a waiting purchase that predates the account's opening balance", async () => {
        await seedAccounts(db);
        await applyPendingWrites(
            db,
            [walletWrite("a", { card: "Binance Card", currency: "USD", dedupeKey: null })],
            NOW
        );
        await db.insert(accounts).values({
            currency: "USD",
            dateCreated: NOW,
            id: "acc-binance",
            initialBalanceDate: new Date(NOW.getTime() + 60 * 60 * 1000),
            name: "Binance",
            updatedAt: NOW,
        });
        await fileWaitingPurchases(db);

        const [row] = await db.select({ accountId: transactions.accountId }).from(transactions);
        expect(row?.accountId).toBeNull();
    });

    it("files a waiting purchase restored after its card got the account", async () => {
        await seedAccounts(db);
        await applyPendingWrites(
            db,
            [walletWrite("a", { card: "Binance Card", currency: "USD", dedupeKey: null })],
            NOW
        );
        const [queued] = await db.select({ id: transactions.id }).from(transactions);
        await transactionsRepo.remove(db, queued?.id ?? "");
        await pickCardAccount(db, "Binance Card", "acc-n26");
        await transactionsRepo.restore(db, queued?.id ?? "");
        await fileWaitingPurchases(db);

        const [row] = await db.select({ accountId: transactions.accountId }).from(transactions);
        expect(row?.accountId).toBe("acc-n26");
    });

    it("queues nothing on a card while the ledger has no accounts", async () => {
        await applyPendingWrites(db, [walletWrite("a", { card: "Visa", currency: "USD", dedupeKey: null })], NOW);

        const cards = parseWalletCards(await getMeta(db, META_KEYS.walletCards));
        expect(cards.map((card) => card.waiting)).toStrictEqual([undefined]);
    });

    it("does not stretch the dedupe window from a skipped duplicate", async () => {
        const minute = 60 * 1000;
        await applyPendingWrites(
            db,
            [
                walletWrite("a"),
                walletWrite("b", { date: NOW.getTime() + 9 * minute }),
                walletWrite("c", { date: NOW.getTime() + 18 * minute }),
            ],
            NOW
        );

        await expect(db.select().from(transactions)).resolves.toHaveLength(2);
    });

    it("points a skipped duplicate's enqueue at the row its purchase landed in", async () => {
        await applyPendingWrites(db, [walletWrite("a"), walletWrite("b")], NOW);

        const rows = await db.select({ id: transactions.id }).from(transactions);
        expect(rows).toHaveLength(1);
        await expect(pendingWriteTxId(db, "b")).resolves.toBe(rows[0]?.id);
    });

    it("leaves a purchase whose currency was a guess off its card's waiting list", async () => {
        await seedAccounts(db);
        await applyPendingWrites(db, [walletWrite("a", { card: "Binance Card", dedupeKey: null })], NOW);
        await pickCardAccount(db, "Binance Card", "acc-n26");

        const [row] = await db.select({ accountId: transactions.accountId }).from(transactions);
        expect(row?.accountId).toBeNull();
    });

    it("leaves a card unattached when No account was picked over its name match", async () => {
        await seedAccounts(db);
        await applyPendingWrites(db, [walletWrite("a", { card: "Chase Sapphire", dedupeKey: null })], NOW);
        await pickCardAccount(db, "Chase Sapphire", null);
        await applyPendingWrites(db, [walletWrite("b", { card: "Chase Sapphire", dedupeKey: null })], NOW);

        const rows = await db.select({ accountId: transactions.accountId }).from(transactions);
        expect(rows.map((row) => String(row.accountId)).toSorted()).toStrictEqual(["acc-chase", "null"]);
    });

    it("takes the account's currency when the amount's symbol is ambiguous", async () => {
        await seedAccounts(db);
        await applyPendingWrites(db, [walletWrite("a", { amountText: "$6.40", card: "Chase Sapphire" })], NOW);
        const [row] = await db.select({ currency: transactions.currency }).from(transactions);
        expect(row?.currency).toBe("MXN");
    });

    it("keeps the amount's own currency over the account's", async () => {
        await seedAccounts(db);
        await applyPendingWrites(db, [walletWrite("a", { amountText: "12,40 zł", card: "N26" })], NOW);
        const [row] = await db.select({ currency: transactions.currency }).from(transactions);
        expect(row?.currency).toBe("PLN");
    });

    it("leaves an unseen merchant's category to the merchant lookup", async () => {
        await applyPendingWrites(db, [walletWrite("a")], NOW);

        const [row] = await db.select({ categoryId: transactions.categoryId, id: transactions.id }).from(transactions);
        expect(row?.categoryId).toBeNull();
        expect(JSON.parse((await getMeta(db, META_KEYS.enrichmentOutbox)) ?? "[]")).toStrictEqual([row?.id]);
    });

    it("files an unseen merchant under the first category until the AI providers are allowed", async () => {
        await setBoolSetting(db, "aiConsentV2", false);

        await applyPendingWrites(db, [walletWrite("a")], NOW);

        const [row] = await db.select({ categoryId: transactions.categoryId }).from(transactions);
        expect(row?.categoryId).toBe("cat-expense");
        await expect(getMeta(db, META_KEYS.enrichmentOutbox)).resolves.toBeNull();
    });

    it("files an unseen merchant under the first category when lookups are off", async () => {
        await setBoolSetting(db, "aiEnrichment", false);

        await applyPendingWrites(db, [walletWrite("a")], NOW);

        const [row] = await db.select({ categoryId: transactions.categoryId }).from(transactions);
        expect(row?.categoryId).toBe("cat-expense");
        await expect(getMeta(db, META_KEYS.enrichmentOutbox)).resolves.toBeNull();
    });

    it("drops an entry with no category to file it under", async () => {
        await db.delete(categories);
        await setBoolSetting(db, "aiEnrichment", false);

        const applied = await applyPendingWrites(db, [walletWrite("a")], NOW);

        expect(applied).toBe(0);
        await expect(liveRows(db)).resolves.toHaveLength(0);
    });

    it("does not re-write a replayed job again after the first replay landed", async () => {
        const job = walletWrite("j1");
        await applyPendingWrites(db, [job], NOW);
        const [first] = await liveRows(db);

        await transactionsRepo.remove(db, first?.id ?? "", NOW);
        const replay = new Date(NOW.getTime() + WALLET_DEDUPE_WINDOW_MS + 1);
        await applyPendingWrites(db, [job], replay);
        await expect(undeleted(db)).resolves.toHaveLength(1);

        const later = new Date(replay.getTime() + WALLET_DEDUPE_WINDOW_MS + 1);
        await applyPendingWrites(db, [job], later);
        await applyPendingWrites(db, [job], new Date(later.getTime() + WALLET_DEDUPE_WINDOW_MS + 1));

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
        const claim = () => ({ jobs: [job], names: ["claimed-1.jsonl"] });
        const release = () => {
            released += 1;
        };

        // Both catch-up paths at once: the effect body at mount, and the first AppState "active" just after.
        const [first, second] = await Promise.all([
            drainPendingWrites(db, claim, release),
            drainPendingWrites(db, claim, release),
        ]);

        await expect(db.select().from(transactions)).resolves.toHaveLength(1);
        expect(first).toBe(1);
        expect(second).toBe(1);
        expect(released).toBe(1);
    });

    it("drains again once the first pass has finished", async () => {
        const claim = jest
            .fn<() => { jobs: PendingWrite[]; names: string[] }>()
            .mockReturnValueOnce({ jobs: [walletWrite("wallet-1")], names: ["a.jsonl"] })
            .mockReturnValueOnce({
                jobs: [walletWrite("wallet-2", { dedupeKey: "wallet:expense:other:100" })],
                names: ["b.jsonl"],
            });

        await drainPendingWrites(db, claim, () => undefined);
        await drainPendingWrites(db, claim, () => undefined);

        await expect(db.select().from(transactions)).resolves.toHaveLength(2);
    });
});

test("adds the card's usual fee to a foreign Wallet charge, inside the queue's own transaction", async () => {
    const db = transactionalDatabase();
    await seedCategories(db);
    await seedAccounts(db);
    await transactionsRepo.create(db, {
        accountId: "acc-n26",
        amount: 10,
        categoryId: "cat-expense",
        currency: "USD",
        date: new Date("2026-03-01T09:00:00Z"),
        details: null,
        fee: { amount: null, categoryId: "cat-expense", currency: "EUR", note: "Fee · Grok", rate: 0.035 },
        income: false,
        note: "Grok",
    });

    await applyPendingWrites(db, [walletWrite("a", { amountText: "$6.40", card: "N26", currency: "USD" })], NOW);

    const [charge] = await db.select().from(transactions).where(eq(transactions.note, "Blue Bottle"));
    expect(cardFeeFor(db, charge?.id ?? "")).toMatchObject({ currency: "EUR", feeRate: 0.035 });
});

test("adds the card's usual fee when a foreign charge that waited on its card gets the account", async () => {
    const db = transactionalDatabase();
    await seedCategories(db);
    await seedAccounts(db);
    await transactionsRepo.create(db, {
        accountId: "acc-n26",
        amount: 10,
        categoryId: "cat-expense",
        currency: "USD",
        date: new Date("2026-03-01T09:00:00Z"),
        details: null,
        fee: { amount: null, categoryId: "cat-expense", currency: "EUR", note: "Fee · Grok", rate: 0.035 },
        income: false,
        note: "Grok",
    });
    await applyPendingWrites(db, [walletWrite("a", { amountText: "$6.40", card: "Work card", currency: "USD" })], NOW);

    await pickCardAccount(db, "Work card", "acc-n26");

    const [charge] = await db.select().from(transactions).where(eq(transactions.note, "Blue Bottle"));
    expect(charge?.accountId).toBe("acc-n26");
    expect(cardFeeFor(db, charge?.id ?? "")).toMatchObject({ accountId: "acc-n26", currency: "EUR", feeRate: 0.035 });
});

test("keeps a fee typed on a waiting charge when its card gets the account", async () => {
    const db = transactionalDatabase();
    await seedCategories(db);
    await seedAccounts(db);
    await transactionsRepo.create(db, {
        accountId: "acc-n26",
        amount: 10,
        categoryId: "cat-expense",
        currency: "USD",
        date: new Date("2026-03-01T09:00:00Z"),
        details: null,
        fee: { amount: null, categoryId: "cat-expense", currency: "EUR", note: "Fee · Grok", rate: 0.035 },
        income: false,
        note: "Grok",
    });
    await applyPendingWrites(db, [walletWrite("a", { amountText: "$6.40", card: "Work card", currency: "USD" })], NOW);
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

    await pickCardAccount(db, "Work card", "acc-n26");

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

        await applyPendingWrites(db, [watchWrite("old", NOW.getTime())], NOW);
        await applyPendingWrites(db, [watchWrite("new", later.getTime())], later);

        await expect(appliedWriteIds(db, later.getTime() - 86_400_000)).resolves.toStrictEqual(["new"]);
    });
});
