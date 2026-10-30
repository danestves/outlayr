import { merchantKey } from "@outlayr/money/merchant-key";

import { getCachedEnrichment } from "@/domain/enrichment-cache";
import type { EnrichmentCacheLookup } from "@/domain/enrichment-cache";
import { scrubLabel } from "@/domain/import-ai-payload";
import { resolveMerchant } from "@/domain/merchant-resolver";

export interface ReviewEntryIdentity {
    displayName: string;
    domain: string | null;
}

export function cachedLabelEnrichment(label: string): EnrichmentCacheLookup {
    const scrubbed = getCachedEnrichment(merchantKey(scrubLabel(label)));
    return scrubbed.hit ? scrubbed : getCachedEnrichment(merchantKey(label));
}

export function reviewEntryIdentity(note: string): ReviewEntryIdentity {
    const scrubbed = scrubLabel(note);
    const displayName = scrubbed.length > 0 ? scrubbed : note;
    const match = resolveMerchant(note);
    if (match?.domain != null) {
        return { displayName, domain: match.domain };
    }
    const cached = cachedLabelEnrichment(note);
    return {
        displayName,
        domain: cached.hit ? (cached.value?.domain ?? null) : null,
    };
}
