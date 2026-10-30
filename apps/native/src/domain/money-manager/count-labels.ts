import { formatFixed } from "@/domain/money";
import type { TranslateFn } from "@/i18n/context";

/** Stems with `.one` / `.other` twins: `t`'s own plurals print a raw count, these print it grouped. */
export type CountedStem =
    | "mmImport.accountSheet.leaveOutDetail"
    | "mmImport.count.accounts"
    | "mmImport.count.budgets"
    | "mmImport.count.categories"
    | "mmImport.count.entries"
    | "mmImport.done.allMatch"
    | "mmImport.done.more"
    | "mmImport.overview.import"
    | "mmImport.overview.pairs"
    | "mmImport.overview.startSkipMatches"
    | "mmImport.uncategorized.morePairs"
    | "mmImport.uncategorized.pairsTitle";

export function tc(t: TranslateFn, stem: CountedStem, n: number, params?: Record<string, string>): string {
    const key = n === 1 ? (`${stem}.one` as const) : (`${stem}.other` as const);
    return t(key, { shown: formatFixed(n, 0), ...params });
}
