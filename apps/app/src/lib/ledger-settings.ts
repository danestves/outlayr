import { settingsOf } from "@outlayr/money/ledger-view";
import type { LedgerSettings } from "@outlayr/money/ledger-view";
import type { DbClient } from "@tanstack/react-db";
import { createContext, useContext, useMemo } from "react";
import { useLocale } from "react-intlayer";

import { useNumberLocale } from "./exchange-locale";
import { clockTime, money } from "./ledger";
import { ledgerCollections, useRows } from "./ledger-db";
import { weekStart } from "./week-start";

export const LedgerSettingsContext = createContext<LedgerSettings>(settingsOf([]));

const useMetaRows = () => useRows(ledgerCollections.appMeta);

export function useLedgerSettings(): LedgerSettings {
    const rows = useMetaRows();
    const { locale } = useLocale();
    return useMemo(() => {
        const settings = settingsOf(rows);
        const chosen = rows.find((row) => row.key === "firstWeekday")?.value;
        const explicit = chosen === "1" || chosen === "2" ? Number(chosen) : null;
        const firstWeekday = weekStart(explicit, locale);
        return firstWeekday === settings.firstWeekday ? settings : { ...settings, firstWeekday };
    }, [locale, rows]);
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
    const numberLocale = useNumberLocale();
    return useMemo(
        () => ({
            clockTime: (time: string) => clockTime(time, use24HourClock),
            money: (amount: number, currency: string, sign?: "always" | "auto") =>
                money(amount, currency, sign, showCents, numberLocale),
        }),
        [numberLocale, showCents, use24HourClock]
    );
}
