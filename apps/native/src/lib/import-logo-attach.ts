import type { ImportEntry } from "@/data/transfer-core";
import { reviewEntryIdentity } from "@/domain/import-review-identity";
import { logoCacheKey, readCachedLogo } from "@/lib/logo-cache";

interface Brand {
    bytes: Uint8Array;
    color: string | null;
}

/** Persisted per transaction, so deleting one row can never orphan another's image. */
export async function attachImportLogos(entries: readonly ImportEntry[]): Promise<ImportEntry[]> {
    // SAFETY: untyped `require`, asserted to that module's own type.
    const photoStorage = require("@/lib/photo-storage") as typeof import("@/lib/photo-storage");
    // SAFETY: as on the line above.
    const { glowFromImage } = require("@/theme/glow") as typeof import("@/theme/glow");

    const brands = new Map<string, Brand | null>();
    const result: ImportEntry[] = [];
    /* oxlint-disable no-await-in-loop -- the `brands` map memoises one read per domain, and the miss must land in it before the next entry sharing that domain is reached */
    for (const entry of entries) {
        const identity = reviewEntryIdentity(entry.note);
        if (identity.domain == null) {
            result.push(entry);
            continue;
        }
        let brand = brands.get(identity.domain);
        if (brand === undefined) {
            const cached = await readCachedLogo(logoCacheKey(identity.domain, identity.domain));
            brand = cached.kind === "logo" ? { bytes: cached.bytes, color: null } : null;
            brands.set(identity.domain, brand);
        }
        if (brand == null) {
            result.push(entry);
            continue;
        }
        try {
            const imageUri = await photoStorage.persistLogoBytes(brand.bytes);
            if (brand.color == null) {
                const hues = await glowFromImage(imageUri);
                brand.color = hues[0] ?? null;
            }
            result.push({ ...entry, imageColor: brand.color, imageUri });
        } catch {
            result.push(entry);
        }
    }
    /* oxlint-enable no-await-in-loop */
    return result;
}
