export interface LogCurrencyOptionsInput {
    /** Only favourites are tested: dropping `global` or `produced` would strand the user. Absent offers every one. */
    convertible?: (code: string) => boolean;
    favourites: readonly string[];
    global: string;
    produced: readonly string[];
}

// The ledger's own currency always leads, so callers read the first option as "no override".
export function logCurrencyOptions({ global, favourites, produced, convertible }: LogCurrencyOptionsInput): string[] {
    const reachable = convertible ? favourites.filter((code) => convertible(code.trim())) : favourites;
    const options: string[] = [];
    const seen = new Set<string>();
    for (const raw of [global, ...reachable, ...produced]) {
        const code = raw.trim();
        // Upper-cased only for the duplicate check: rate lookups and labels match the code as the data spells it.
        const key = code.toUpperCase();
        if (!key || seen.has(key)) {
            continue;
        }
        seen.add(key);
        options.push(code);
    }
    return options;
}
