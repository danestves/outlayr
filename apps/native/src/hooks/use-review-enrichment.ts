import { useEffect, useMemo, useState } from "react";

import type { ImportEntry } from "@/data/transfer-core";
import { reviewEntryIdentity } from "@/domain/import-review-identity";
import { cachedLogoUri, logoCacheKey } from "@/lib/logo-cache";
import { fetchMerchantImage } from "@/lib/logo-fetch";

export interface ReviewEnrichment {
    displayName: string;
    logoUri: string | null;
}

const FETCH_BATCH = 4;

export function useReviewEnrichment(entries: readonly ImportEntry[]): ReadonlyMap<number, ReviewEnrichment> {
    const identities = useMemo(() => entries.map((entry) => reviewEntryIdentity(entry.note)), [entries]);
    const [fetched, setFetched] = useState<ReadonlyMap<string, string | null>>(new Map());

    // Once per distinct merchant: `cachedLogoUri` makes several blocking file-system calls, and per row that is
    // O(rows x domains) syscalls on the JS thread.
    const onDisk = useMemo(() => {
        const map = new Map<string, string | null>();
        for (const identity of identities) {
            if (identity.domain == null) {
                continue;
            }
            const key = logoCacheKey(identity.domain, identity.domain);
            if (!map.has(key)) {
                map.set(key, cachedLogoUri(key));
            }
        }
        return map;
    }, [identities]);

    useEffect(() => {
        const pending = new Map<string, { name: string; domain: string }>();
        for (const identity of identities) {
            if (identity.domain == null) {
                continue;
            }
            const key = logoCacheKey(identity.domain, identity.domain);
            if (pending.has(key) || onDisk.get(key) != null) {
                continue;
            }
            pending.set(key, { domain: identity.domain, name: identity.domain });
        }
        if (pending.size === 0) {
            return;
        }
        let cancelled = false;
        const queue = [...pending.entries()];
        const settle = (key: string) => {
            if (cancelled) {
                return;
            }
            setFetched((prev) => {
                const resolved = cachedLogoUri(key);
                // Compared by VALUE, not presence: a timed-out first attempt records null, and a presence check would
                // refuse the later attempt that succeeds.
                if (prev.get(key) === resolved) {
                    return prev;
                }
                return new Map(prev).set(key, resolved);
            });
        };
        const worker = async () => {
            let item = queue.shift();
            while (item != null) {
                if (cancelled) {
                    return;
                }
                const [key, request] = item;
                // oxlint-disable-next-line no-await-in-loop -- this loop IS the concurrency limit: FETCH_BATCH workers drain one shared queue, so each must finish its fetch before taking the next domain
                await fetchMerchantImage(request).catch(() => null);
                settle(key);
                item = queue.shift();
            }
        };
        for (let i = 0; i < Math.min(FETCH_BATCH, queue.length); i += 1) {
            worker();
        }
        return () => {
            cancelled = true;
        };
    }, [identities, onDisk]);

    return useMemo(() => {
        const map = new Map<number, ReviewEnrichment>();
        for (const [index, identity] of identities.entries()) {
            const key = identity.domain == null ? null : logoCacheKey(identity.domain, identity.domain);
            const logoUri = key == null ? null : (onDisk.get(key) ?? fetched.get(key) ?? null);
            map.set(index, { displayName: identity.displayName, logoUri });
        }
        return map;
    }, [identities, fetched, onDisk]);
}
