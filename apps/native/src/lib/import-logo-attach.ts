import * as Effect from "effect/Effect";

import type { ImportEntry } from "@/data/transfer-core";
import { reviewEntryIdentity } from "@/domain/import-review-identity";
import { logoCacheKey, readCachedLogo } from "@/lib/logo-cache";

interface Brand {
    bytes: Uint8Array;
    color: string | null;
}

/** Persisted per transaction, so deleting one row can never orphan another's image. */
export const attachImportLogos = Effect.fn("ImportLogoAttach.attach")(function* attachImportLogos(
    entries: readonly ImportEntry[]
) {
    const photoStorage = yield* Effect.promise(() => import("@/lib/photo-storage"));
    const { glowFromImage } = yield* Effect.promise(() => import("@/theme/glow"));

    const brands = new Map<string, Brand | null>();
    const result: ImportEntry[] = [];
    // Sequential: the `brands` map memoises one read per domain, and the miss must land in it before the next entry
    // sharing that domain is reached.
    for (const entry of entries) {
        const identity = reviewEntryIdentity(entry.note);
        if (identity.domain == null) {
            result.push(entry);
            continue;
        }
        let brand = brands.get(identity.domain);
        if (brand === undefined) {
            const cached = yield* readCachedLogo(logoCacheKey(identity.domain, identity.domain));
            brand = cached.kind === "logo" ? { bytes: cached.bytes, color: null } : null;
            brands.set(identity.domain, brand);
        }
        if (brand == null) {
            result.push(entry);
            continue;
        }
        const attached = yield* Effect.gen(function* attach() {
            const imageUri = yield* photoStorage.persistLogoBytes(brand.bytes);
            if (brand.color == null) {
                const hues = yield* glowFromImage(imageUri);
                brand.color = hues[0] ?? null;
            }
            return { ...entry, imageColor: brand.color, imageUri };
        }).pipe(Effect.orElseSucceed(() => entry));
        result.push(attached);
    }
    return result;
});
