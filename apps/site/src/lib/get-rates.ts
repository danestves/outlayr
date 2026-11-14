import { createServerFn } from "@tanstack/react-start";

import { hasKey } from "./has-key";
import { RATE_MARKETS, decodeQuotes, parseRates } from "./rates";
import type { Rate, RateSlug } from "./rates";

const FRESH_FOR_MS = 3 * 60 * 60 * 1000;
const RETRY_AFTER_MS = 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;

const cache = new Map<RateSlug, { expires: number; rates: Promise<Rate[] | null> }>();

async function fetchRates(slug: RateSlug): Promise<Rate[] | null> {
    try {
        const response = await fetch(RATE_MARKETS[slug].url, {
            headers: { accept: "application/json" },
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!response.ok) {
            return null;
        }
        const rates = parseRates(slug, decodeQuotes(await response.json()), Date.now());
        return rates.length > 0 ? rates : null;
    } catch {
        return null;
    }
}

function loadRates(slug: RateSlug): Promise<Rate[] | null> {
    const hit = cache.get(slug);
    if (hit && hit.expires > Date.now()) {
        return hit.rates;
    }
    const entry = { expires: Date.now() + FRESH_FOR_MS, rates: fetchRates(slug) };
    cache.set(slug, entry);
    void entry.rates.then((rates) => {
        if (rates === null) {
            entry.expires = Date.now() + RETRY_AFTER_MS;
        }
    });
    return entry.rates;
}

export const getRates = createServerFn({ method: "GET" })
    .validator((slug: string) => {
        if (!hasKey(RATE_MARKETS, slug)) {
            throw new Error("Unknown rate market");
        }
        return slug;
    })
    .handler(({ data }) => loadRates(data));
