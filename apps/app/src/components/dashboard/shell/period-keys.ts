import { useMemo } from "react";

import { startOfDay } from "@/lib/dashboard-series-ledger";
import { periodKeyOf, periodOf, shiftPeriodKey } from "@/lib/dashboard-series-period";

import type { Dashboard } from "./dashboard";

const MONTHS_LISTED = 24;

const monthsBetween = (from: string, to: string) => {
    const [fromYear = 0, fromMonth = 0] = from.split("-").map(Number);
    const [toYear = 0, toMonth = 0] = to.split("-").map(Number);
    return (toYear - fromYear) * 12 + toMonth - fromMonth;
};

export function periodKeysOf(ledger: Dashboard["ledger"], currentKey: string) {
    const earliest = ledger.rows.reduce((first, row) => (row.day < first ? row.day : first), ledger.today);
    const count = Math.min(monthsBetween(periodKeyOf(earliest, ledger.firstDayOfMonth), currentKey) + 1, MONTHS_LISTED);
    const keys = Array.from({ length: count }, (_, index) => shiftPeriodKey(currentKey, -index));
    const { opening } = ledger;
    return opening === null
        ? keys
        : keys.filter((key) => startOfDay(ledger, periodOf(key, ledger.firstDayOfMonth).from) >= opening.cutoff);
}

export function usePeriodKeys({ filters, ledger }: Pick<Dashboard, "filters" | "ledger">) {
    return useMemo(() => periodKeysOf(ledger, filters.currentKey), [filters.currentKey, ledger]);
}
