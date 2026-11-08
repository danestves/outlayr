import { useMemo } from "react";

import { periodKeyOf, shiftPeriodKey } from "@/lib/dashboard-series-period";

import type { Dashboard } from "./dashboard";

const MONTHS_LISTED = 24;

const monthsBetween = (from: string, to: string) => {
    const [fromYear = 0, fromMonth = 0] = from.split("-").map(Number);
    const [toYear = 0, toMonth = 0] = to.split("-").map(Number);
    return (toYear - fromYear) * 12 + toMonth - fromMonth;
};

export function usePeriodKeys({ filters, ledger }: Pick<Dashboard, "filters" | "ledger">) {
    return useMemo(() => {
        const earliest = ledger.rows.reduce((first, row) => (row.day < first ? row.day : first), ledger.today);
        const count = Math.min(
            monthsBetween(periodKeyOf(earliest, ledger.firstDayOfMonth), filters.currentKey) + 1,
            MONTHS_LISTED
        );
        return Array.from({ length: count }, (_, index) => shiftPeriodKey(filters.currentKey, -index));
    }, [filters.currentKey, ledger.firstDayOfMonth, ledger.rows, ledger.today]);
}
