import { eq, isNotNull } from "drizzle-orm";

import { accounts, transactions } from "@/db/schema";

import { getMeta, META_KEYS, setMeta } from "./app-meta-core";
import type { SpendDb } from "./budget-spent";

export interface CachedOriginal {
    bytes: Uint8Array;
    /** What a copy stored before plates looks like, from `blackBakedSignature`. */
    signature: Uint8Array;
}

export interface LogoReplateDeps {
    originalsFor: (name: string) => Promise<readonly CachedOriginal[]>;
    persist: (bytes: Uint8Array) => Promise<string>;
    signature: (uri: string) => Promise<Uint8Array | null>;
}

/** Mean per-channel difference two signatures can show and still be one image re-encoded. */
const SIGNATURE_TOLERANCE = 6;

function sameImage(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) {
        return false;
    }
    let total = 0;
    for (const [index, value] of a.entries()) {
        total += Math.abs(value - b[index]);
    }
    return total / a.length <= SIGNATURE_TOLERANCE;
}

const TABLES = [
    { imageUri: transactions.imageUri, name: transactions.note, table: transactions },
    { imageUri: accounts.imageUri, name: accounts.name, table: accounts },
] as const;

// Replaced only when the row's name files a cached logo AND the photo matches it drawn over black: a receipt on a
// Netflix row passes the first, a dark photo the second. shortcut: a renamed row or a reclaimed cache entry keeps its
// black tile; re-resolve the merchant's domain if that turns out common.
export async function replateStoredLogos(db: SpendDb, deps: LogoReplateDeps): Promise<number> {
    if ((await getMeta(db, META_KEYS.logoPlates)) != null) {
        return 0;
    }

    const signatures = new Map<string, Uint8Array | null>();
    const replaced = new Map<string, string>();

    const replacement = async (uri: string, name: string): Promise<string | null> => {
        if (!signatures.has(uri)) {
            signatures.set(uri, await deps.signature(uri));
        }
        const stored = signatures.get(uri);
        if (stored == null) {
            return null;
        }
        const originals = await deps.originalsFor(name);
        const original = originals.find((candidate) => sameImage(candidate.signature, stored));
        return original == null ? null : await deps.persist(original.bytes);
    };

    /* oxlint-disable no-await-in-loop -- rows sharing a photo must see the replacement the first of them stored, or each would store its own copy */
    for (const { imageUri, name, table } of TABLES) {
        const rows = await db.selectDistinct({ imageUri, name }).from(table).where(isNotNull(imageUri));
        for (const row of rows) {
            const uri = row.imageUri;
            if (uri == null) {
                continue;
            }
            const next = replaced.get(uri) ?? (await replacement(uri, row.name));
            if (next == null) {
                continue;
            }
            replaced.set(uri, next);
            await db.update(table).set({ imageUri: next }).where(eq(imageUri, uri));
        }
    }
    /* oxlint-enable no-await-in-loop */

    await setMeta(db, META_KEYS.logoPlates, "1");
    return replaced.size;
}
