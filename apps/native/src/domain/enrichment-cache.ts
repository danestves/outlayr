import type { Suggestion } from "@outlayr/backend/confect/enrichment.spec";

export type RemoteEnrichmentResult = Suggestion;

export type EnrichmentCacheLookup = { hit: true; value: RemoteEnrichmentResult | null } | { hit: false };

const CACHE_LIMIT = 50;

const cache = new Map<string, RemoteEnrichmentResult | null>();

/**
 * Scoped by currency, the model's locator, so one name can resolve to a different business per currency. A
 * caller with no currency (the import review) uses the bare partition.
 */
function cacheKey(key: string, currency: string | undefined): string {
    return currency ? `${key}|${currency}` : key;
}

export function getCachedEnrichment(key: string, currency?: string): EnrichmentCacheLookup {
    const scoped = cacheKey(key, currency);
    if (!cache.has(scoped)) {
        return { hit: false };
    }
    return { hit: true, value: cache.get(scoped) ?? null };
}

export function setCachedEnrichment(key: string, value: RemoteEnrichmentResult | null, currency?: string): void {
    const scoped = cacheKey(key, currency);
    if (!cache.has(scoped) && cache.size >= CACHE_LIMIT) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey !== undefined) {
            cache.delete(oldestKey);
        }
    }
    cache.set(scoped, value);
}

export function clearEnrichmentCache(): void {
    cache.clear();
}
