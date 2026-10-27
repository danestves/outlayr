import { eq, isNotNull } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

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

const LogoReplateOperation = Schema.Literals(["originals", "persist", "rows", "signature"]);

export class LogoReplateError extends Schema.TaggedError<LogoReplateError>()("LogoReplateError", {
    cause: Schema.Defect(),
    operation: LogoReplateOperation,
}) {
    override get message(): string {
        return `Logo replate ${this.operation} failed`;
    }
}

const attempt = <A>(operation: typeof LogoReplateOperation.Type, run: () => PromiseLike<A>) =>
    Effect.tryPromise({ catch: (cause) => new LogoReplateError({ cause, operation }), try: run });

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
export const replateStoredLogos = Effect.fn("LogoReplate.replateStoredLogos")(function* replateStoredLogos(
    db: SpendDb,
    deps: LogoReplateDeps
) {
    if ((yield* attempt("rows", () => getMeta(db, META_KEYS.logoPlates))) != null) {
        return 0;
    }

    const signatures = new Map<string, Uint8Array | null>();
    const replaced = new Map<string, string>();

    const replacement = Effect.fn("LogoReplate.replacement")(function* replacement(uri: string, name: string) {
        if (!signatures.has(uri)) {
            signatures.set(uri, yield* attempt("signature", () => deps.signature(uri)));
        }
        const stored = signatures.get(uri);
        if (stored == null) {
            return null;
        }
        const originals = yield* attempt("originals", () => deps.originalsFor(name));
        const original = originals.find((candidate) => sameImage(candidate.signature, stored));
        return original == null ? null : yield* attempt("persist", () => deps.persist(original.bytes));
    });

    // Rows sharing a photo must see the replacement the first of them stored, or each would store its own copy.
    for (const { imageUri, name, table } of TABLES) {
        const rows = yield* attempt("rows", () =>
            db.selectDistinct({ imageUri, name }).from(table).where(isNotNull(imageUri))
        );
        for (const row of rows) {
            const uri = row.imageUri;
            if (uri == null) {
                continue;
            }
            const next = replaced.get(uri) ?? (yield* replacement(uri, row.name));
            if (next == null) {
                continue;
            }
            replaced.set(uri, next);
            yield* attempt("rows", () => db.update(table).set({ imageUri: next }).where(eq(imageUri, uri)));
        }
    }

    yield* attempt("rows", () => setMeta(db, META_KEYS.logoPlates, "1"));
    return replaced.size;
});
