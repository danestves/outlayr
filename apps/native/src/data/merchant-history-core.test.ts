import { beforeEach, describe, expect, it } from "@jest/globals";
import * as Effect from "effect/Effect";

import type { Database } from "@/db/client";
import { accounts, categories, transactions } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";
import { merchantKey } from "@/domain/merchant-resolver";

import {
    HISTORY_WINDOW,
    RECENT_MERCHANT_WINDOW,
    recentMerchantNotesQuery,
    recentMerchants,
    rememberedCategoryFor,
} from "./merchant-history-core";

let db: Database;
let clock = 0;

function log(
    note: string,
    categoryId: string | null,
    options: { accountId?: string; income?: boolean; deleted?: boolean; feeForId?: string; transferId?: string } = {}
): void {
    clock += 1;
    const date = new Date(clock * 1000);
    const income = options.income ?? false;
    if (categoryId != null) {
        db.insert(categories)
            .values({ id: categoryId, income, name: categoryId, sortOrder: 0, updatedAt: date })
            .onConflictDoNothing()
            .run();
    }
    db.insert(transactions)
        .values({
            accountId: options.accountId ?? null,
            amount: 10,
            categoryId,
            date,
            day: date,
            deletedAt: options.deleted === true ? date : null,
            feeForId: options.feeForId ?? null,
            id: `tx-${clock}`,
            income,
            month: date,
            note,
            transferId: options.transferId ?? null,
            updatedAt: date,
        })
        .run();
}

function account(id: string, kind: "asset" | "person"): void {
    const date = new Date(0);
    db.insert(accounts)
        .values({ currency: "USD", dateCreated: date, id, initialBalanceDate: date, kind, name: id, updatedAt: date })
        .run();
}

function remembered(name: string, income = false): Promise<string | null> {
    return Effect.runPromise(rememberedCategoryFor(db, merchantKey(name), income));
}

beforeEach(() => {
    db = migratedDatabase();
    clock = 0;
});

describe("reading a merchant's category back out of the ledger", () => {
    it("answers with the category the user filed it under", async () => {
        log("Rio Supermercado", "groceries");
        await expect(remembered("Rio Supermercado")).resolves.toBe("groceries");
    });

    it("matches an accented merchant typed without accents", async () => {
        // The reason the lookup reads a recency window instead of narrowing with
        // SQL LIKE: SQLite would not fold "Panadería" onto the normalised key.
        log("Panadería La Mejor", "food");
        await expect(remembered("Panaderia La Mejor")).resolves.toBe("food");
    });

    it("does not answer with a category from the other side of the ledger", async () => {
        log("Acme", "salary", { income: true });
        await expect(remembered("Acme", false)).resolves.toBeNull();
        await expect(remembered("Acme", true)).resolves.toBe("salary");
    });

    it("ignores deleted entries", async () => {
        log("Netflix", "entertainment", { deleted: true });
        await expect(remembered("Netflix")).resolves.toBeNull();
    });

    it("ignores a sale recorded with a person", async () => {
        account("pedro", "person");
        log("Sold on credit", "sales", { accountId: "pedro", income: true });
        await expect(remembered("Sold on credit", true)).resolves.toBeNull();
    });

    it("remembers what a person paid for", async () => {
        account("pedro", "person");
        log("Lunch", "food", { accountId: "pedro" });
        await expect(remembered("Lunch")).resolves.toBe("food");
    });

    it("ignores entries that were never categorised", async () => {
        log("Netflix", null);
        await expect(remembered("Netflix")).resolves.toBeNull();
    });

    it("ignores the category a fee was filed under", async () => {
        db = migratedDatabase({ foreignKeys: false });
        log("Netflix", "fees", { feeForId: "purchase-1" });
        log("Netflix", "fees", { transferId: "transfer-1" });
        await expect(remembered("Netflix")).resolves.toBeNull();
    });

    it("forgets a merchant pushed out of the recency window", async () => {
        log("Panaderia La Mejor", "food");
        for (let filler = 0; filler < HISTORY_WINDOW; filler += 1) {
            log(`Filler ${filler}`, "other");
        }
        await expect(remembered("Panaderia La Mejor")).resolves.toBeNull();
    });
});

/** The names the "recently" cluster would offer, most recent first. */
async function recent(limit = 6, income = false): Promise<string[]> {
    return recentMerchants(await recentMerchantNotesQuery(db, income), limit);
}

describe("reading the merchants this ledger already knows", () => {
    it("answers with the merchants filed, most recent first", async () => {
        log("Panaderia", "food");
        log("Rio Supermercado", "groceries");
        await expect(recent()).resolves.toStrictEqual(["Rio Supermercado", "Panaderia"]);
    });

    it("counts a merchant once however it was spelled, keeping the newest spelling", async () => {
        log("panaderia la mejor", "food");
        log("Panadería La Mejor", "food");
        await expect(recent()).resolves.toStrictEqual(["Panadería La Mejor"]);
    });

    it("stays on one side of the ledger", async () => {
        log("Acme", "salary", { income: true });
        log("Rio Supermercado", "groceries");
        await expect(recent()).resolves.toStrictEqual(["Rio Supermercado"]);
        await expect(recent(6, true)).resolves.toStrictEqual(["Acme"]);
    });

    it("ignores deleted entries", async () => {
        log("Netflix", "entertainment", { deleted: true });
        await expect(recent()).resolves.toStrictEqual([]);
    });

    it("leaves out the fee a transfer or a card charged", async () => {
        db = migratedDatabase({ foreignKeys: false });
        log("Rio Supermercado", "groceries");
        log("Fee · Rio Supermercado", "fees", { feeForId: "tx-1" });
        log("Fee · Chase → Ally Savings", null, { transferId: "transfer-1" });
        await expect(recent()).resolves.toStrictEqual(["Rio Supermercado"]);
    });

    // Uncategorised is not unnamed: a merchant the user never filed under
    // anything is still one they have bought from.
    it("offers a merchant the user never categorised", async () => {
        log("Netflix", null);
        await expect(recent()).resolves.toStrictEqual(["Netflix"]);
    });

    it("leaves out a sale recorded with a person, but not what they paid for", async () => {
        account("checking", "asset");
        account("pedro", "person");
        log("Rio Supermercado", "groceries", { accountId: "checking" });
        log("Lunch", "food", { accountId: "pedro" });
        log("Sold on credit", "sales", { accountId: "pedro", income: true });
        await expect(recent()).resolves.toStrictEqual(["Lunch", "Rio Supermercado"]);
        await expect(recent(6, true)).resolves.toStrictEqual([]);
    });

    it("stops at the limit it was given", async () => {
        for (const name of ["A shop", "B shop", "C shop"]) {
            log(name, "other");
        }
        await expect(recent(2)).resolves.toStrictEqual(["C shop", "B shop"]);
    });

    it("forgets a merchant pushed out of the recency window", async () => {
        log("Panaderia", "food");
        for (let filler = 0; filler < RECENT_MERCHANT_WINDOW; filler += 1) {
            log(`Filler ${filler}`, "other");
        }
        await expect(recent(RECENT_MERCHANT_WINDOW + 1)).resolves.not.toContain("Panaderia");
    });
});
