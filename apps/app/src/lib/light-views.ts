import type { PushRow } from "@outlayr/backend/confect/sync";

import { accountsCovered } from "@/components/dashboard/accounts/model";
import { homeCovered } from "@/components/dashboard/home/model";
import { listCovered, rangeOf } from "@/components/dashboard/transactions/model";
import { pageQueryOf } from "@/components/dashboard/transactions/search";
import type { PageSearch } from "@/components/dashboard/transactions/search";

import { prepareLedger } from "./dashboard-series-ledger";
import type { Ledger } from "./dashboard-series-ledger";
import { periodKeyOf, periodOf } from "./dashboard-series-period";
import type { Period } from "./dashboard-series-period";

const LIGHT_MONTHS = { "/": 13, "/accounts": 12, "/transactions": 1 } as const;

export type LightPath = keyof typeof LIGHT_MONTHS;

const isLightPath = (pathname: string): pathname is LightPath => Object.hasOwn(LIGHT_MONTHS, pathname);

export const lightPathOf = (pathname: string, searchStr: string) =>
    searchStr === "" && isLightPath(pathname) ? pathname : null;

export function lightSince(path: LightPath, asOf: number) {
    const today = new Date(asOf);
    return Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - LIGHT_MONTHS[path], 1);
}

export function viewCovered(ledger: Ledger, period: Period, pathname: string, search: PageSearch) {
    if (ledger.opening === null) {
        return true;
    }
    switch (pathname) {
        case "/": {
            return homeCovered(ledger, period);
        }
        case "/accounts": {
            return accountsCovered(ledger);
        }
        case "/transactions": {
            const { custom, span } = pageQueryOf(search);
            return listCovered(ledger, rangeOf({ custom, key: period.key, span }, ledger.firstDayOfMonth));
        }
        default: {
            return false;
        }
    }
}

export function reachesOpening({ books, opening }: Pick<Ledger, "books" | "opening">, rows: readonly PushRow[]) {
    if (opening === null) {
        return false;
    }
    return rows.some((row) => {
        switch (row.table) {
            case "outsideMoves":
            case "outsidePayments":
            case "transactions":
            case "transfers": {
                const held = books[row.table].find((doc) => doc.localId === row.localId);
                return row.fields.date < opening.cutoff || (held !== undefined && held.date < opening.cutoff);
            }
            default: {
                return false;
            }
        }
    });
}

export function opensLight(path: LightPath, books: Ledger["books"], now: number, opening: Ledger["opening"]) {
    const ledger = prepareLedger(books, now, opening);
    const period = periodOf(periodKeyOf(ledger.today, ledger.firstDayOfMonth), ledger.firstDayOfMonth);
    return viewCovered(ledger, period, path, {});
}
