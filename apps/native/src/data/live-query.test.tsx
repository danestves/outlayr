import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, render, renderHook, waitFor } from "@testing-library/react-native";
import type BetterSqlite3 from "better-sqlite3";
import { eq, lte } from "drizzle-orm";
import type { ReactNode } from "react";
import { useState } from "react";
import { Text } from "react-native";

import type { Database } from "@/db/client";
import { appMeta, transactions } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";

import { useLiveQuery, useLiveValue, useRatesRead } from "./live-query";
import { bumpRatesRevision } from "./rates-revision";
import { createTabPause, TabPauseContext } from "./tab-pause";
import { readNow, useNow } from "./use-now";

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

async function fireChange(tableName: string, rows = 1) {
    await act(async () => {
        for (let row = 0; row < rows; row += 1) {
            // oxlint-disable-next-line unicorn/no-useless-spread -- mirrors the copy the real listener list is iterated over
            for (const listener of [...mockChangeListeners]) {
                listener({ tableName });
            }
        }
        await new Promise((resolve) => {
            setTimeout(resolve, 0);
        });
    });
}

const makeDb = migratedDatabase;

function sqlite(db: Database): BetterSqlite3.Database {
    return (db as unknown as { $client: BetterSqlite3.Database }).$client;
}

function write(db: Database, key: string, value: string) {
    sqlite(db)
        .prepare("INSERT INTO appMeta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .run(key, value);
}

let renders = 0;

function Probe({ db, watch }: { db: Database; watch: string }) {
    const value = useLiveValue(
        appMeta,
        () => db.select().from(appMeta).where(eq(appMeta.key, watch)),
        (rows) => rows[0]?.value ?? "unset",
        [watch]
    );
    renders += 1;
    return <Text testID="probe">{value}</Text>;
}

describe("useLiveValue", () => {
    let db: Database;

    beforeEach(() => {
        db = makeDb();
        mockChangeListeners.clear();
        renders = 0;
    });

    it("does not re-render when an invalidation leaves the derived value unchanged", async () => {
        const { getByTestId } = await render(<Probe db={db} watch="alpha" />);
        await waitFor(() => expect(getByTestId("probe").props.children).toBe("unset"));
        const before = renders;

        write(db, "beta", "irrelevant");
        await fireChange("appMeta");

        expect(renders).toBe(before);
        expect(getByTestId("probe").props.children).toBe("unset");
    });

    it("re-renders when the watched value changes", async () => {
        const { getByTestId } = await render(<Probe db={db} watch="alpha" />);
        await waitFor(() => expect(getByTestId("probe").props.children).toBe("unset"));
        const before = renders;

        write(db, "alpha", "one");
        await fireChange("appMeta");

        await waitFor(() => expect(getByTestId("probe").props.children).toBe("one"));
        expect(renders).toBeGreaterThan(before);
    });

    it("re-reads once for a write's burst of row events, not once per row", async () => {
        let reads = 0;
        const { result } = await renderHook(() =>
            useLiveValue(
                appMeta,
                () => {
                    reads += 1;
                    return db.select().from(appMeta);
                },
                (rows) => rows.length
            )
        );
        const before = reads;

        write(db, "alpha", "one");
        await fireChange("appMeta", 300);

        expect(reads - before).toBe(1);
        expect(result.current).toBe(1);
    });
});

describe("useRatesRead", () => {
    it("re-reads once per rates revision and never per written row", async () => {
        mockChangeListeners.clear();
        let reads = 0;
        const { result } = await renderHook(() =>
            useRatesRead(() => {
                reads += 1;
                return reads;
            })
        );

        await act(async () => {
            for (let row = 0; row < 300; row += 1) {
                // oxlint-disable-next-line unicorn/no-useless-spread -- mirrors the copy the real listener list is iterated over
                for (const listener of [...mockChangeListeners]) {
                    listener({ tableName: "exchangeRates" });
                }
            }
        });
        expect(reads).toBe(1);

        await act(async () => {
            bumpRatesRevision();
        });
        expect(reads).toBe(2);
        expect(result.current).toBe(2);
    });
});

describe("a useLiveQuery bounded by the clock", () => {
    let db: Database;
    let reads = 0;
    let clockMs = Date.now();

    beforeEach(() => {
        db = makeDb();
        mockChangeListeners.clear();
        reads = 0;
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    function useRowsUpTo(boundMs: number) {
        return useLiveQuery(
            transactions,
            () => {
                reads += 1;
                return db
                    .select({ id: transactions.id })
                    .from(transactions)
                    .where(lte(transactions.date, new Date(boundMs)));
            },
            [boundMs],
            boundMs
        );
    }

    async function saveEntryLater(dateMs = 1) {
        sqlite(db)
            .prepare(
                "INSERT INTO transactions (id, amount, income, date, day, month, updatedAt) VALUES ('t', 1, 0, ?, 1, 1, 1)"
            )
            .run(dateMs);
        clockMs += 60_000;
        jest.spyOn(Date, "now").mockReturnValue(clockMs);
        await fireChange("transactions");
    }

    it("runs its query once for a write that moves useNow()", async () => {
        const { result } = await renderHook(() => useRowsUpTo(useNow()));
        const before = reads;

        await saveEntryLater();

        expect(reads - before).toBe(1);
        expect(result.current).toHaveLength(1);
    });

    it("runs its query once when its tab is selected again after a write it missed", async () => {
        const pause = createTabPause();
        const { result } = await renderHook(() => useRowsUpTo(useNow()), {
            wrapper: ({ children }: { children: ReactNode }) => (
                <TabPauseContext.Provider value={pause}>{children}</TabPauseContext.Provider>
            ),
        });
        pause.setSelected(false);
        const before = reads;

        await saveEntryLater();
        expect(reads).toBe(before);

        await act(async () => {
            pause.setSelected(true);
        });

        expect(reads - before).toBe(1);
        expect(result.current).toHaveLength(1);
    });

    it("still picks up a write when its bound was pinned at the reading", async () => {
        await renderHook(() => useNow());
        const pinnedMs = readNow();
        const { result } = await renderHook(() => useRowsUpTo(pinnedMs));

        await saveEntryLater();

        expect(result.current).toHaveLength(1);
    });

    it("moves useNow() on a payment made outside Outlayr", async () => {
        const { result } = await renderHook(() => useNow());
        const before = result.current;
        clockMs += 60_000;
        jest.spyOn(Date, "now").mockReturnValue(clockMs);

        await fireChange("outsidePayments");

        expect(result.current).toBeGreaterThan(before);
    });

    it("leaves a bound that never followed the clock still when a write keeps its rows", async () => {
        await renderHook(() => useNow());
        await renderHook(() => {
            renders += 1;
            const [boundMs] = useState(Date.now);
            return useRowsUpTo(boundMs);
        });
        const before = renders;

        await saveEntryLater(Date.UTC(2100, 0, 1));

        expect(renders).toBe(before);
    });
});
