const USD = "USD";

/** Newest official units per US dollar by code, and the day of the newest one. */
export function usdRates(rows: readonly { date: string; quote: string; rate: number; rateType: string }[]) {
    const newest = new Map<string, { date: string; rate: number }>([[USD, { date: "", rate: 1 }]]);
    let latest = "";
    for (const row of rows) {
        if (row.rateType !== "official") {
            continue;
        }
        if ((newest.get(row.quote)?.date ?? "") <= row.date) {
            newest.set(row.quote, row);
        }
        latest = row.date > latest ? row.date : latest;
    }
    return { latest, rate: (code: string) => newest.get(code)?.rate ?? null };
}

export function crossRate(rate: (code: string) => number | null, from: string, to: string) {
    const base = rate(from);
    const quote = rate(to);
    return base === null || quote === null || base === 0 ? null : quote / base;
}

/** Below one, significant digits keep a weak currency's rate from rounding to 0.00. */
export function formatRate(value: number, locale = "en-US"): string {
    return value < 1
        ? value.toLocaleString(locale, { maximumSignificantDigits: 3 })
        : value.toLocaleString(locale, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}
