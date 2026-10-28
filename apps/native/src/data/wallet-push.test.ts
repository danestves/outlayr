import { eq } from "drizzle-orm";
import * as Effect from "effect/Effect";
import { expect, test } from "vite-plus/test";

import { accounts, categories, transactions } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";

import { META_KEYS, setMeta } from "./app-meta-core";
import { transactionsRepo } from "./transactions-core";
import { buildWalletPush } from "./wallet-push";

const NOW = new Date("2026-03-04T09:00:00Z");

test("says where the next tap lands, the way the drain will file it", async () => {
    const db = migratedDatabase();
    await db.insert(accounts).values([
        {
            currency: "EUR",
            dateCreated: NOW,
            id: "acc-chase",
            initialBalanceDate: NOW,
            name: "Chase Sapphire",
            updatedAt: NOW,
        },
        { currency: "EUR", dateCreated: NOW, id: "acc-n26", initialBalanceDate: NOW, name: "N26", updatedAt: NOW },
    ]);
    await db.insert(categories).values([
        { id: "cat-food", income: false, name: "Restaurants", sortOrder: 0, updatedAt: NOW },
        { id: "cat-coffee", income: false, name: "Coffee", sortOrder: 1, updatedAt: NOW },
        { id: "cat-salary", income: true, name: "Salary", sortOrder: 0, updatedAt: NOW },
    ]);
    await Effect.runPromise(
        setMeta(
            db,
            META_KEYS.walletCards,
            JSON.stringify([
                { lastAt: 1, text: "Chase Sapphire Visa" },
                { accountId: "acc-n26", lastAt: 1, text: "Work card" },
                { lastAt: 1, text: "Revolut" },
                { accountId: null, lastAt: 1, text: "Amex" },
            ])
        )
    );
    const entry = (note: string, categoryId: string, date: string, income = false) =>
        Effect.runPromise(
            transactionsRepo.create(db, {
                accountId: null,
                amount: 5,
                categoryId,
                currency: "EUR",
                date: new Date(date),
                details: null,
                fee: null,
                income,
                note,
            })
        );
    await entry("vietnam house", "cat-coffee", "2026-02-01T12:00:00Z");
    await entry("Vietnam House", "cat-food", "2026-03-01T12:00:00Z");
    await entry("VIETNAM HOUSE", "cat-coffee", "2026-01-01T12:00:00Z");
    await entry("Acme", "cat-salary", "2026-03-01T12:00:00Z", true);
    const deleted = await entry("Gone Cafe", "cat-coffee", "2026-03-02T12:00:00Z");
    await db.update(transactions).set({ deletedAt: NOW }).where(eq(transactions.id, deleted));

    await expect(Effect.runPromise(buildWalletPush(db))).resolves.toStrictEqual({
        cards: {
            Amex: { label: null, pick: false },
            "Chase Sapphire Visa": { label: "Chase Sapphire", pick: false },
            Revolut: { label: "Which account is Revolut? Tap to pick.", pick: true },
            "Work card": { label: "N26", pick: false },
        },
        newPlace: "New place, tap to pick a category.",
        patterns: expect.objectContaining({ money: { ignoreCase: false, source: expect.any(String) } }),
        places: { expense: { "vietnam house": "Restaurants" }, income: { acme: "Salary" } },
    });
});

test("never asks which account while the ledger has none", async () => {
    const db = migratedDatabase();
    await Effect.runPromise(setMeta(db, META_KEYS.walletCards, JSON.stringify([{ lastAt: 1, text: "Visa" }])));

    await expect(Effect.runPromise(buildWalletPush(db))).resolves.toMatchObject({
        cards: { Visa: { label: null, pick: false } },
    });
});

test("keeps the newest category when two spellings of a place normalize together", async () => {
    const db = migratedDatabase();
    await db.insert(categories).values([
        { id: "cat-food", income: false, name: "Restaurants", sortOrder: 0, updatedAt: NOW },
        { id: "cat-coffee", income: false, name: "Coffee", sortOrder: 1, updatedAt: NOW },
    ]);
    const entry = (note: string, categoryId: string, date: string) =>
        Effect.runPromise(
            transactionsRepo.create(db, {
                accountId: null,
                amount: 5,
                categoryId,
                currency: "EUR",
                date: new Date(date),
                details: null,
                fee: null,
                income: false,
                note,
            })
        );
    await entry("Café", "cat-coffee", "2026-02-01T12:00:00Z");
    await entry("Cafe\u0301", "cat-food", "2026-03-01T12:00:00Z");

    await expect(Effect.runPromise(buildWalletPush(db))).resolves.toMatchObject({
        places: { expense: { café: "Restaurants" } },
    });
});
