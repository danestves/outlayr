import { useEffect, useState } from "react";

import { reviewEntryIdentity } from "@/domain/import-review-identity";
import { cachedLogoUri, logoCacheKey } from "@/lib/logo-cache";
import { fetchMerchantImage } from "@/lib/logo-fetch";

// Null for good when there is no mark: the caller shows nothing, never a placeholder.
export function useMerchantMark(name: string | null, spokenDomain: string | null = null): string | null {
    const domain = (name === null ? null : reviewEntryIdentity(name).domain) ?? spokenDomain;
    const key = domain === null ? null : logoCacheKey(domain, domain);
    const [fetched, setFetched] = useState<{ key: string; uri: string | null } | null>(null);

    useEffect(() => {
        if (key === null || domain === null || cachedLogoUri(key) !== null) {
            return;
        }
        let cancelled = false;
        fetchMerchantImage({ domain, name: domain })
            .catch(() => null)
            .then(() => {
                if (!cancelled) {
                    setFetched({ key, uri: cachedLogoUri(key) });
                }
            });
        return () => {
            cancelled = true;
        };
    }, [domain, key]);

    if (key === null) {
        return null;
    }
    return cachedLogoUri(key) ?? (fetched?.key === key ? fetched.uri : null);
}
