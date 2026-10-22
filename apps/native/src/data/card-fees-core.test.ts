import { describe, expect, it, test } from "@jest/globals";
import { eq } from "drizzle-orm";

import type { Database } from "@/db/client";
import { exchangeRates, transactions } from "@/db/schema";
import { transactionalDatabase } from "@/db/test-database";

import { backfillCanonicalUsd } from "./canonicalize-backfill";
import {
    cardFeeFor,
    feeRatesOn,
    goesWithPendingDelete,
    lastForeignFeeRate,
    settlePendingFees,
    suggestedCardFee,
} from "./card-fees-core";
import type { CardFeeInput } from "./card-fees-core";
import { backfillRecurring } from "./recurrence-backfill";
import { deletedTransactionsQuery, transactionsRepo } from "./transactions-core";
import type { TransactionInput } from "./transactions-core";

const GLOVO: TransactionInput = {
    accountId: "card",
    amount: 10.91,
    categoryId: "food",
    currency: "EUR",
    date: new Date(Date.UTC(2026, 8, 22, 12)),
    details: null,
    exchangeRate: 1 / 1.1485,
    exchangeRateType: "custom",
    income: false,
    note: "Glovo",
};

const FEE: CardFeeInput = { amount: null, categoryId: "fees", currency: "USD", note: "Fee · Glovo", rate: 0.035 };

const makeDb = () => transactionalDatabase({ foreignKeys: false });

const rowsFor = (db: Database, purchaseId: string) =>
    db.select().from(transactions).where(eq(transactions.feeForId, purchaseId)).all();

describe("a card fee on a purchase", () => {
    it("is saved as its own expense on the purchase's account and day", async () => {
        const db = makeDb();
        const id = await transactionsRepo.create(db, { ...GLOVO, fee: FEE });

        expect(cardFeeFor(db, id)).toMatchObject({
            accountId: "card",
            amount: 0.44,
            amountUsd: 0.44,
            categoryId: "fees",
            currency: "USD",
            date: GLOVO.date,
            feeRate: 0.035,
            income: false,
            note: "Fee · Glovo",
        });
    });

    it("is rewritten in place, left alone when the edit never mentions it, and tombstoned when removed", async () => {
        const db = makeDb();
        const id = await transactionsRepo.create(db, { ...GLOVO, fee: FEE });
        const feeId = cardFeeFor(db, id)?.id;

        await transactionsRepo.update(db, id, { ...GLOVO, fee: { ...FEE, rate: 0.01 } });
        expect(cardFeeFor(db, id)).toMatchObject({ amount: 0.13, feeRate: 0.01, id: feeId });

        await transactionsRepo.update(db, id, { ...GLOVO, note: "Glovo Express" });
        expect(cardFeeFor(db, id)?.amount).toBe(0.13);

        await transactionsRepo.update(db, id, { ...GLOVO, fee: null });
        expect(cardFeeFor(db, id)).toBeNull();
        expect(rowsFor(db, id)).toHaveLength(1);
    });

    it("goes and comes back with its purchase, and never shows in Recently Deleted", async () => {
        const db = makeDb();
        const id = await transactionsRepo.create(db, { ...GLOVO, fee: FEE });

        await transactionsRepo.remove(db, id);
        expect(cardFeeFor(db, id)).toBeNull();
        expect((await deletedTransactionsQuery(db)).map((row) => row.note)).toStrictEqual(["Glovo"]);

        await transactionsRepo.restore(db, id);
        expect(cardFeeFor(db, id)?.amount).toBe(0.44);
    });

    it("comes back from Recently Deleted when it was deleted on its own", async () => {
        const db = makeDb();
        const id = await transactionsRepo.create(db, { ...GLOVO, fee: FEE });
        const feeId = cardFeeFor(db, id)?.id ?? "";

        await transactionsRepo.remove(db, feeId);
        expect((await deletedTransactionsQuery(db)).map((row) => row.note)).toStrictEqual(["Fee · Glovo"]);

        await transactionsRepo.restore(db, feeId);
        expect(cardFeeFor(db, id)?.id).toBe(feeId);
    });

    it("is not restored next to a fee the purchase already has", async () => {
        const db = makeDb();
        const id = await transactionsRepo.create(db, { ...GLOVO, fee: FEE });
        const feeId = cardFeeFor(db, id)?.id ?? "";

        await transactionsRepo.remove(db, feeId);
        await transactionsRepo.update(db, id, { ...GLOVO, fee: { ...FEE, rate: 0.01 } });
        await transactionsRepo.restore(db, feeId);

        expect(rowsFor(db, id).filter((row) => row.deletedAt === null)).toHaveLength(1);
    });

    it("is not written for a purchase a peer has deleted", async () => {
        const db = makeDb();
        const id = await transactionsRepo.create(db, { ...GLOVO, fee: FEE });
        await transactionsRepo.remove(db, id);

        await transactionsRepo.update(db, id, { ...GLOVO, fee: FEE });

        expect(cardFeeFor(db, id)).toBeNull();
    });

    it("waits for a rate it cannot work out yet, and settles once the rate lands", async () => {
        const db = makeDb();
        const id = await transactionsRepo.create(db, { ...GLOVO, exchangeRate: null, exchangeRateType: "official" });
        await transactionsRepo.update(db, id, { ...GLOVO, exchangeRate: null, exchangeRateType: "official", fee: FEE });
        expect(cardFeeFor(db, id)).toMatchObject({ amount: 0, feeRate: 0.035 });

        await db.insert(exchangeRates).values({
            date: "2026-09-22",
            fetchedAt: GLOVO.date.getTime(),
            quote: "EUR",
            rate: 1 / 1.1485,
            rateType: "official",
            source: "frankfurter",
        });
        await backfillCanonicalUsd(db);
        await settlePendingFees(db);

        expect(cardFeeFor(db, id)).toMatchObject({ amount: 0.44, amountUsd: 0.44 });
    });

    it("keeps its price through an edit that leaves the money alone, once the rates are gone", async () => {
        const db = makeDb();
        const rate = (quote: string, value: number) => ({
            date: "2026-09-22",
            fetchedAt: GLOVO.date.getTime(),
            quote,
            rate: value,
            rateType: "official",
            source: "frankfurter",
        });
        await db.insert(exchangeRates).values([rate("GBP", 0.75), rate("EUR", 0.85)]);
        const purchase = { ...GLOVO, currency: "GBP", exchangeRate: null, exchangeRateType: "official" as const };
        const fee: CardFeeInput = { ...FEE, currency: "EUR" };
        const id = await transactionsRepo.create(db, { ...purchase, fee });
        const priced = cardFeeFor(db, id)?.amount;

        const frozen = db.select().from(transactions).where(eq(transactions.id, id)).all()[0]?.exchangeRate;

        await db.delete(exchangeRates);
        await transactionsRepo.update(db, id, { ...purchase, exchangeRate: frozen, fee, note: "Glovo Express" });

        expect(priced).toBeGreaterThan(0);
        expect(cardFeeFor(db, id)?.amount).toBe(priced);
    });

    it("is priced again when only the purchase's rate changes", async () => {
        const db = makeDb();
        const id = await transactionsRepo.create(db, { ...GLOVO, fee: FEE });

        await transactionsRepo.update(db, id, { ...GLOVO, exchangeRate: 1 / 1.2, fee: FEE });

        expect(cardFeeFor(db, id)?.amount).toBe(0.46);
    });

    it("stays deleted while its purchase is", async () => {
        const db = makeDb();
        const id = await transactionsRepo.create(db, { ...GLOVO, fee: FEE });
        const feeId = cardFeeFor(db, id)?.id ?? "";

        await transactionsRepo.remove(db, id);
        await transactionsRepo.restore(db, feeId);

        expect(cardFeeFor(db, id)).toBeNull();
    });
});

describe("the fee a card is known to charge", () => {
    it("is the rate on the card's last foreign-currency purchase", async () => {
        const db = makeDb();
        await transactionsRepo.create(db, { ...GLOVO, fee: FEE });
        await transactionsRepo.create(db, {
            ...GLOVO,
            currency: "USD",
            date: new Date(Date.UTC(2026, 8, 23)),
            fee: { ...FEE, rate: 0.01 },
            note: "Grok",
        });

        expect(lastForeignFeeRate(db, "card", "USD")).toBe(0.035);
        expect(feeRatesOn(db, "card")).toStrictEqual([0.01, 0.035]);
    });

    it("is nothing when that purchase carried no fee", async () => {
        const db = makeDb();
        await transactionsRepo.create(db, { ...GLOVO, fee: FEE });
        await transactionsRepo.create(db, { ...GLOVO, date: new Date(Date.UTC(2026, 8, 23)), note: "Airbnb" });

        expect(lastForeignFeeRate(db, "card", "USD")).toBeNull();
    });
});

test("hides a fee with the purchase or transfer waiting on its undo, and nothing while none is", () => {
    expect(
        goesWithPendingDelete({ feeForId: "glovo", id: "fee", installmentId: null, transferId: null }, "glovo")
    ).toBe(true);
    expect(
        goesWithPendingDelete({ feeForId: null, id: "wire-fee", installmentId: null, transferId: "wire" }, "wire")
    ).toBe(true);
    expect(goesWithPendingDelete({ feeForId: null, id: "grok", installmentId: null, transferId: null }, "glovo")).toBe(
        false
    );
    expect(goesWithPendingDelete({ feeForId: null, id: "grok", installmentId: null, transferId: null }, null)).toBe(
        false
    );
    const late = { feeForId: null, id: "late-fee", installmentId: "zapatos-3", transferId: null };
    expect(goesWithPendingDelete(late, "zapatos", new Set(["zapatos-1", "zapatos-3"]))).toBe(true);
    expect(goesWithPendingDelete(late, "tenis", new Set(["tenis-1"]))).toBe(false);
});

test("rides every charge a subscription generates", async () => {
    const db = makeDb();
    const id = await transactionsRepo.create(db, {
        ...GLOVO,
        amount: 10,
        currency: "USD",
        date: new Date(Date.UTC(2026, 6, 23, 12)),
        exchangeRate: null,
        exchangeRateType: null,
        fee: { ...FEE, rate: 0.01 },
        note: "Grok",
        onceRecurring: true,
        recurringType: 3,
    });

    await backfillRecurring(db, id, new Date(Date.UTC(2026, 8, 23, 18)));

    const fees = db
        .select()
        .from(transactions)
        .all()
        .filter((row) => row.feeForId !== null);
    expect(fees.map((row) => row.amount)).toStrictEqual([0.1, 0.1, 0.1]);
});

test("offers the card's usual fee on a foreign charge, and none on a local one", async () => {
    const db = makeDb();
    await transactionsRepo.create(db, { ...GLOVO, fee: FEE });
    const card = { currency: "USD", id: "card" };

    expect(
        suggestedCardFee(db, { account: card, categoryId: "food", currency: "EUR", merchant: "Free Now" })
    ).toMatchObject({
        amount: null,
        currency: "USD",
        rate: 0.035,
    });
    expect(suggestedCardFee(db, { account: card, categoryId: "food", currency: "USD", merchant: "Grok" })).toBeNull();
});
