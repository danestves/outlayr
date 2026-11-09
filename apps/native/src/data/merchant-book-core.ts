import { knowledgeKeys } from "@outlayr/money/merchant-key";
import * as Effect from "effect/Effect";

import type { Database } from "@/db/client";
import type { RemoteEnrichmentResult } from "@/domain/enrichment-cache";
import type { MerchantBook as Book } from "@/domain/meta-values";

import { Meta } from "./app-meta-core";

export const BOOK_TTL_MS = 90 * 24 * 60 * 60 * 1000;
export const MAX_BOOK_ENTRIES = 500;

export type RememberedAnswer = Omit<RemoteEnrichmentResult, "grounding">;

export const rememberMerchant = Effect.fn("MerchantBook.rememberMerchant")(function* rememberMerchant(
    db: Database,
    name: string,
    currency: string | null | undefined,
    answer: RememberedAnswer,
    now: number = Date.now()
) {
    const keys = knowledgeKeys(name, currency, answer.merchantName);
    if (keys.length === 0 || (answer.categoryName == null && answer.domain == null && answer.merchantName == null)) {
        return;
    }
    const book = yield* Meta.get(db, "merchantBook");
    const entry: Book[string] = {
        answer: {
            categoryName: answer.categoryName,
            domain: answer.domain,
            emoji: answer.emoji,
            isNewCategory: answer.isNewCategory,
            parentCategoryName: answer.parentCategoryName,
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
    yield* Meta.set(db, "merchantBook", Object.fromEntries(live));
});

export const recallMerchant = Effect.fn("MerchantBook.recallMerchant")(function* recallMerchant(
    db: Database,
    name: string,
    currency: string | null | undefined,
    now: number = Date.now()
) {
    const book = yield* Meta.get(db, "merchantBook");
    for (const key of knowledgeKeys(name, currency)) {
        const entry = book[key];
        if (entry != null && entry.expiresAt > now) {
            const answer: RemoteEnrichmentResult = { ...entry.answer, grounding: false, merchantName: null };
            return answer;
        }
    }
    return null;
});
