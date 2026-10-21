import { utcDateString } from "@outlayr/money/dates";
import { ENTRY_RATE_TYPES } from "@outlayr/money/rates";
import type { EntryRateType } from "@outlayr/money/rates";
import type { RateTable } from "@outlayr/money/valuation";

/** The only currency `resolveEntryRate` accepts `eur_reference` for. */
const EUR_REFERENCE_CURRENCY = "VES";

const BINANCE_PAIR: ReadonlySet<string> = new Set(["USD", "VES"]);

export type TransferRateChoice = EntryRateType | "binance";

// `binance` is never an entry type (USDT is not USD); the transfer editor offers it as a reference saved as `custom`.
export function rateTypeOptions(currency: string): EntryRateType[] {
    return ENTRY_RATE_TYPES.filter((type) => type !== "eur_reference" || currency === EUR_REFERENCE_CURRENCY);
}

export function transferRateOptions(from: string, to: string): TransferRateChoice[] {
    const binance = from !== to && BINANCE_PAIR.has(from) && BINANCE_PAIR.has(to);
    return rateTypeOptions(to).flatMap<TransferRateChoice>((type) =>
        binance && type === "custom" ? ["binance", type] : [type]
    );
}

function perUsd(currency: string, dateKey: string, rates: RateTable): number | null {
    if (currency === "USD") {
        return 1;
    }
    const rate = rates.get(currency, dateKey);
    return rate !== null && Number.isFinite(rate) && rate > 0 ? rate : null;
}

export function marketRateFor(from: string, to: string, date: Date, rates: RateTable): number | null {
    if (from === to) {
        return 1;
    }
    const dateKey = utcDateString(date.getTime());
    const fromRate = perUsd(from, dateKey, rates);
    const toRate = perUsd(to, dateKey, rates);
    if (fromRate === null || toRate === null) {
        return null;
    }
    const rate = toRate / fromRate;
    return Number.isFinite(rate) && rate > 0 ? rate : null;
}
