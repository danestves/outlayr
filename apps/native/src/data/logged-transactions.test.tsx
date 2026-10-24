import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook } from "@testing-library/react-native";
import { eq } from "drizzle-orm";

import type { Database } from "@/db/client";
import { transactions } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";

import { useLoggedTransactions } from "./transactions";

type ChangeListener = (event: { tableName: string }) => void;

const mockChangeListeners = new Set<ChangeListener>();

jest.mock("expo-sqlite", () => ({
    addDatabaseChangeListener: (listener: ChangeListener) => {
        mockChangeListeners.add(listener);
        return {
            remove: () => {
                mockChangeListeners.delete(listener);
            },
        };
    },
}));

async function fireChange() {
    await act(async () => {
        for (const listener of mockChangeListeners) {
            listener({ tableName: "transactions" });
        }
        await new Promise((resolve) => {
            setTimeout(resolve, 0);
        });
    });
}

const NOW = new Date(2025, 6, 15, 12).getTime();
const daysAgo = (days: number) => new Date(2025, 6, 15 - days);

let db: Database;

beforeEach(async () => {
    db = migratedDatabase();
    mockChangeListeners.clear();
    await db.insert(transactions).values(
        [
            { day: daysAgo(1), id: "recent" },
            { day: daysAgo(60), id: "old" },
            { day: daysAgo(61), id: "older" },
        ].map(({ day, id }) => ({
            amount: 5,
            date: new Date(day.getTime() + 3_600_000),
            day,
            id,
            income: false,
            month: new Date(day.getFullYear(), day.getMonth(), 1),
            note: id,
            updatedAt: new Date(0),
        }))
    );
});

const ids = (rows: readonly { id: string }[]) => rows.map((row) => row.id);

describe("useLoggedTransactions", () => {
    it("keeps the older days' rows through a write to a recent entry", async () => {
        const { result } = await renderHook(() => useLoggedTransactions(db, NOW, 540));
        const { tail } = result.current;
        expect(ids(result.current.head)).toStrictEqual(["recent"]);
        expect(ids(tail)).toStrictEqual(["old", "older"]);

        await db
            .update(transactions)
            .set({ note: "edited", updatedAt: new Date(NOW) })
            .where(eq(transactions.id, "recent"));
        await fireChange();

        expect(result.current.head[0]?.note).toBe("edited");
        expect(result.current.tail).toBe(tail);
    });

    it("pages in older days without rebuilding the ones already held, and still shows an edit to them", async () => {
        const { rerender, result } = await renderHook(
            ({ days }: { days: number }) => useLoggedTransactions(db, NOW, days),
            {
                initialProps: { days: 2 },
            }
        );
        const [old] = result.current.tail;
        expect(ids(result.current.tail)).toStrictEqual(["old"]);

        await rerender({ days: 3 });
        expect(ids(result.current.tail)).toStrictEqual(["old", "older"]);
        expect(result.current.tail[0]).toBe(old);

        await db.update(transactions).set({ amountUsd: 5.5 }).where(eq(transactions.id, "old"));
        await fireChange();
        expect(result.current.tail[0]?.amountUsd).toBe(5.5);
    });

    it("re-reads the older days when one of their rows changes, stamp or no stamp", async () => {
        const { result } = await renderHook(() => useLoggedTransactions(db, NOW, 540));

        // The canonicalize backfill rewrites history without moving `updatedAt`.
        await db.update(transactions).set({ amountUsd: 5.5 }).where(eq(transactions.id, "old"));
        await fireChange();
        expect(result.current.tail[0]?.amountUsd).toBe(5.5);

        await db
            .update(transactions)
            .set({ deletedAt: new Date(NOW) })
            .where(eq(transactions.id, "older"));
        await fireChange();
        expect(ids(result.current.tail)).toStrictEqual(["old"]);
    });
});
