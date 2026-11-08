import { settingsOf } from "@outlayr/backend/confect/ledgerView";
import type { LedgerSettings } from "@outlayr/backend/confect/ledgerView";
import { useLiveQuery } from "@tanstack/react-db";
import type { DbClient } from "@tanstack/react-db";
import { createContext, useContext, useMemo } from "react";

import { clockTime, money } from "./ledger";
import { ledgerCollections } from "./ledger-db";

export const LedgerSettingsContext = createContext<LedgerSettings>(settingsOf([]));

function useMetaRows() {
    return useLiveQuery({
        query: (q) => q.from({ row: ledgerCollections.appMeta }),
        queryKey: ["ledger.appMeta"],
    }).data;
}

export function useLedgerSettings(): LedgerSettings {
    const rows = useMetaRows();
    return useMemo(() => settingsOf(rows), [rows]);
}

export function useMeta(): ReadonlyMap<string, string | null> {
    const rows = useMetaRows();
    return useMemo(() => new Map(rows.map((row) => [row.key, row.value])), [rows]);
}

export const metaFlag = (meta: ReadonlyMap<string, string | null>, key: string, fallback: boolean) => {
    const raw = meta.get(key);
    return raw === undefined || raw === null ? fallback : raw === "true";
};

export function writeSettings(db: DbClient, changes: Readonly<Record<string, string>>) {
    const meta = db.collection(ledgerCollections.appMeta);
    const updatedAt = Date.now();
    const writes = Object.entries(changes).map(([key, value]) => {
        const transaction = meta.has(key)
            ? meta.update(key, (draft) => {
                  draft.value = value;
                  draft.updatedAt = updatedAt;
              })
            : meta.insert({ key, updatedAt, value });
        return transaction.when("settled");
    });
    return Promise.all(writes);
}

export function useDisplayFormat() {
    const { showCents, use24HourClock } = useContext(LedgerSettingsContext);
    return useMemo(
        () => ({
            clockTime: (time: string) => clockTime(time, use24HourClock),
            money: (amount: number, currency: string, sign?: "always" | "auto") =>
                money(amount, currency, sign, showCents),
        }),
        [showCents, use24HourClock]
    );
}
