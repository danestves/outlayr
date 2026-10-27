import { useAtomValue } from "@effect/atom-react/Hooks";
import * as AsyncResult from "effect/reactivity/AsyncResult";

import type { ImportEntry } from "@/data/transfer-core";
import { reviewEntryIdentity } from "@/domain/import-review-identity";
import { cachedLogoUri, logoCacheKey } from "@/lib/logo-cache";
import { fetchedLogosAtom, logoDomainsKey, NO_FETCHED_LOGOS } from "@/state/merchant-logos";

export interface ReviewEnrichment {
    displayName: string;
    logoUri: string | null;
}

function onDiskLogos(identities: readonly ReturnType<typeof reviewEntryIdentity>[]): Map<string, string | null> {
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
}

export function useReviewEnrichment(entries: readonly ImportEntry[]): ReadonlyMap<number, ReviewEnrichment> {
    const identities = entries.map((entry) => reviewEntryIdentity(entry.note));

    // Once per distinct merchant: `cachedLogoUri` makes several blocking file-system calls, and per row that is
    // O(rows x domains) syscalls on the JS thread.
    const onDisk = onDiskLogos(identities);

    const result = useAtomValue(
        fetchedLogosAtom(
            logoDomainsKey(identities.flatMap((identity) => (identity.domain == null ? [] : [identity.domain])))
        )
    );
    const fetched = AsyncResult.isSuccess(result) ? result.value : NO_FETCHED_LOGOS;

    const map = new Map<number, ReviewEnrichment>();
    for (const [index, identity] of identities.entries()) {
        const key = identity.domain == null ? null : logoCacheKey(identity.domain, identity.domain);
        const logoUri = key == null ? null : (onDisk.get(key) ?? fetched.get(key) ?? null);
        map.set(index, { displayName: identity.displayName, logoUri });
    }
    return map;
}
