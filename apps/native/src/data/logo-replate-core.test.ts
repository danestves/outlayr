import { expect, test } from "@jest/globals";
import * as Effect from "effect/Effect";

import { accounts, transactions } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";

import { replateStoredLogos } from "./logo-replate-core";
import type { CachedOriginal } from "./logo-replate-core";

const NOW = new Date("2026-10-18T12:00:00Z");

const signature = (value: number) => new Uint8Array(16).fill(value);
const BLACK = signature(0);
const NETFLIX = signature(120);

test("re-stores a logo only where the row's name and the photo's pixels both match it", async () => {
    const db = migratedDatabase();
    const row = (id: string, note: string, imageUri: string) => ({
        amount: 10,
        currency: "USD",
        date: NOW,
        day: NOW,
        id,
        imageUri,
        income: false,
        month: NOW,
        note,
        updatedAt: NOW,
    });
    await db
        .insert(transactions)
        .values([
            row("netflix-1", "Netflix", "file:///p/netflix.jpg"),
            row("netflix-2", "Netflix", "file:///p/netflix.jpg"),
            row("receipt", "Netflix", "file:///p/receipt.jpg"),
            row("dark", "Groceries", "file:///p/dark.jpg"),
        ]);
    await db.insert(accounts).values({
        currency: "USD",
        dateCreated: NOW,
        id: "apple",
        imageUri: "file:///p/apple.jpg",
        initialBalanceDate: NOW,
        name: "Apple Card",
        updatedAt: NOW,
    });

    const stored: Record<string, Uint8Array> = {
        "file:///p/apple.jpg": BLACK,
        "file:///p/dark.jpg": BLACK,
        // Re-encoding noise stays inside the tolerance.
        "file:///p/netflix.jpg": signature(123),
        "file:///p/receipt.jpg": signature(200),
    };
    const originals: Record<string, CachedOriginal[]> = {
        "Apple Card": [{ bytes: new Uint8Array([1]), signature: BLACK }],
        Netflix: [{ bytes: new Uint8Array([2]), signature: NETFLIX }],
    };

    await Effect.runPromise(
        replateStoredLogos(db, {
            originalsFor: async (name) => originals[name] ?? [],
            persist: async (bytes) => `file:///p/plated-${bytes[0]}.jpg`,
            signature: async (uri) => stored[uri] ?? null,
        })
    );

    const rows = Object.fromEntries(
        (await db.select({ id: transactions.id, imageUri: transactions.imageUri }).from(transactions)).map((r) => [
            r.id,
            r.imageUri,
        ])
    );
    expect(rows).toStrictEqual({
        dark: "file:///p/dark.jpg",
        "netflix-1": "file:///p/plated-2.jpg",
        "netflix-2": "file:///p/plated-2.jpg",
        receipt: "file:///p/receipt.jpg",
    });
    const [apple] = await db.select({ imageUri: accounts.imageUri }).from(accounts);
    expect(apple.imageUri).toBe("file:///p/plated-1.jpg");
});
