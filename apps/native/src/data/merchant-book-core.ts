import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { Database } from "@/db/client";
import type { RemoteEnrichmentResult } from "@/domain/enrichment-cache";
import { descriptorKey, merchantKey } from "@/domain/merchant-resolver";

import { getMeta, META_KEYS, setMeta } from "./app-meta-core";

export const BOOK_TTL_MS = 90 * 24 * 60 * 60 * 1000;
export const MAX_BOOK_ENTRIES = 500;
const MIN_KEY_LENGTH = 3;

const Book = Schema.Record(
    Schema.String,
    Schema.Struct({
        answer: Schema.Struct({
            categoryName: Schema.NullOr(Schema.String),
            domain: Schema.NullOr(Schema.String),
            emoji: Schema.NullOr(Schema.String),
            isNewCategory: Schema.Boolean,
            parentCategoryName: Schema.NullOr(Schema.String),
            tags: Schema.Array(Schema.String),
        }),
        expiresAt: Schema.Finite,
    })
);

type Book = typeof Book.Type;

const decodeBook = Schema.decodeUnknownSync(Book.pipe(Schema.catchDecoding(() => Effect.succeedSome({}))));

export interface RememberedAnswer extends RemoteEnrichmentResult {
    readonly merchantName: string | null;
}

function bookKeys(name: string, currency: string | null | undefined, merchantName?: string | null): string[] {
    const suffix = currency ? `|${currency.toLowerCase()}` : "";
    const keys = [merchantKey(name), descriptorKey(name), merchantKey(merchantName ?? "")]
        .filter((key) => key.length >= MIN_KEY_LENGTH)
        .map((key) => `${key}${suffix}`);
    return [...new Set(keys)];
}

async function readBook(db: Database): Promise<Book> {
    const raw = await getMeta(db, META_KEYS.merchantBook);
    try {
        return decodeBook(JSON.parse(raw ?? "{}"));
    } catch {
        return {};
    }
}

export async function rememberMerchant(
    db: Database,
    name: string,
    currency: string | null | undefined,
    answer: RememberedAnswer,
    now: number = Date.now()
): Promise<void> {
    const keys = bookKeys(name, currency, answer.merchantName);
    if (keys.length === 0 || (answer.categoryName == null && answer.domain == null && answer.merchantName == null)) {
        return;
    }
    const book = await readBook(db);
    const entry: Book[string] = {
        answer: {
            categoryName: answer.categoryName,
            domain: answer.domain,
            emoji: answer.emoji ?? null,
            isNewCategory: answer.isNewCategory,
            parentCategoryName: answer.parentCategoryName ?? null,
            tags: [...answer.tags],
        },
        expiresAt: now + BOOK_TTL_MS,
    };
    const live = [
        ...Object.entries(book).filter(([existing]) => !keys.includes(existing)),
        ...keys.map((key): [string, Book[string]] => [key, entry]),
    ]
        .filter(([, kept]) => kept.expiresAt > now)
        .slice(-MAX_BOOK_ENTRIES);
    await setMeta(db, META_KEYS.merchantBook, JSON.stringify(Object.fromEntries(live)));
}

export async function recallMerchant(
    db: Database,
    name: string,
    currency: string | null | undefined,
    now: number = Date.now()
): Promise<RemoteEnrichmentResult | null> {
    const book = await readBook(db);
    for (const key of bookKeys(name, currency)) {
        const entry = book[key];
        if (entry != null && entry.expiresAt > now) {
            return entry.answer;
        }
    }
    return null;
}
