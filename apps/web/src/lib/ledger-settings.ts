import { settingsOf } from "@outlayr/backend/confect/ledgerView";
import type { LedgerSettings } from "@outlayr/backend/confect/ledgerView";
import { useLiveQuery } from "@tanstack/react-db";
import { createContext, useContext, useMemo } from "react";

import { clockTime, money } from "./ledger";
import { ledgerCollections } from "./ledger-db";

export const LedgerSettingsContext = createContext<LedgerSettings>(settingsOf([]));

export function useLedgerSettings(): LedgerSettings {
    const { data } = useLiveQuery({
        query: (q) => q.from({ row: ledgerCollections.appMeta }),
        queryKey: ["ledger.appMeta"],
    });
    return useMemo(() => settingsOf(data), [data]);
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
