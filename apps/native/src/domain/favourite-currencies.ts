import { PICKABLE_CURRENCY_CODES } from "@outlayr/money/catalog";

const CATALOGUE: ReadonlySet<string> = new Set(PICKABLE_CURRENCY_CODES);

export const FAVOURITE_CURRENCY_LIMIT = 8;

const SEEDED = ["USD", "EUR"] as const;

// iOS reports Venezuela's currency as `VED` (the 2021 redenomination), but rates are quoted in `VES`.
const ALIASES = new Map<string, string>([["VED", "VES"]]);

/** `detected` is appended, not leading: the ledger currency is chosen a screen later and leads on its own. */
export function seedFavourites(detected: string | null): string[] {
    const seeded: string[] = [...SEEDED];
    if (detected === null) {
        return seeded;
    }
    const named = normalise(detected);
    const code = ALIASES.get(named) ?? named;
    if (CATALOGUE.has(code) && !seeded.includes(code)) {
        seeded.push(code);
    }
    return seeded;
}

function normalise(code: string): string {
    return code.trim().toUpperCase();
}

/**
 * Raw `appMeta`, not a setting: `SETTING_DEFAULTS` admits only booleans and numbers. Unknown codes are dropped,
 * so a currency retired from the catalogue never reaches a screen with nothing to draw for it.
 */
export function parseFavourites(raw: string | null): string[] {
    if (!raw) {
        return [];
    }

    const favourites: string[] = [];
    for (const part of raw.split(",")) {
        const code = normalise(part);
        if (!CATALOGUE.has(code) || favourites.includes(code)) {
            continue;
        }
        favourites.push(code);
        if (favourites.length === FAVOURITE_CURRENCY_LIMIT) {
            break;
        }
    }
    return favourites;
}

export function serialiseFavourites(codes: readonly string[]): string {
    return codes.join(",");
}

export function isFavourite(codes: readonly string[], code: string): boolean {
    const wanted = normalise(code);
    return codes.some((favourite) => normalise(favourite) === wanted);
}

/** Adding past the limit is refused rather than evicting a favourite the user picked; removal never is. */
export function toggleFavourite(codes: readonly string[], code: string): string[] {
    const wanted = normalise(code);
    if (isFavourite(codes, wanted)) {
        return codes.filter((favourite) => normalise(favourite) !== wanted);
    }
    if (codes.length >= FAVOURITE_CURRENCY_LIMIT || !CATALOGUE.has(wanted)) {
        return [...codes];
    }
    return [...codes, wanted];
}
