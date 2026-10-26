import { useAtomValue } from "@effect/atom-react/Hooks";
import * as AsyncResult from "effect/reactivity/AsyncResult";

import { reviewEntryIdentity } from "@/domain/import-review-identity";
import { cachedLogoUri, logoCacheKey } from "@/lib/logo-cache";
import { fetchedLogosAtom, logoDomainsKey, NO_FETCHED_LOGOS } from "@/state/merchant-logos";

// Null for good when there is no mark: the caller shows nothing, never a placeholder.
export function useMerchantMark(name: string | null, spokenDomain: string | null = null): string | null {
    const domain = (name === null ? null : reviewEntryIdentity(name).domain) ?? spokenDomain;
    const key = domain === null ? null : logoCacheKey(domain, domain);
    const result = useAtomValue(fetchedLogosAtom(logoDomainsKey(domain === null ? [] : [domain])));
    const fetched = AsyncResult.isSuccess(result) ? result.value : NO_FETCHED_LOGOS;

    if (key === null) {
        return null;
    }
    return cachedLogoUri(key) ?? fetched.get(key) ?? null;
}
