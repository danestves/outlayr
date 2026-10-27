import { and, desc, eq, inArray, isNull, ne, or } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { Database } from "@/db/client";
import { transactions, transactionTags } from "@/db/schema";
import { transaction } from "@/db/transaction";
import { newId } from "@/domain/ids";
import { merchantKey } from "@/domain/merchant-resolver";

import { forgetLogoDismissal, refreshLogoCandidate } from "./logo-backfill-state";
import { restoreStamp } from "./sync-engine-core";

// `merchantKey` folds diacritics and SQLite can't, so the match runs in JS over a recency window.
const SIBLING_WINDOW = 500;

const MerchantSiblingsOperation = Schema.Literals(["logo", "patch", "scan", "tags"]);

export class MerchantSiblingsError extends Schema.TaggedError<MerchantSiblingsError>()("MerchantSiblingsError", {
    cause: Schema.Defect(),
    operation: MerchantSiblingsOperation,
}) {
    override get message(): string {
        return `Merchant siblings ${this.operation} failed`;
    }
}

const failedAt = (operation: typeof MerchantSiblingsOperation.Type) => (cause: unknown) =>
    new MerchantSiblingsError({ cause, operation });

const query = <A>(operation: typeof MerchantSiblingsOperation.Type, run: () => PromiseLike<A>) =>
    Effect.tryPromise({ catch: failedAt(operation), try: run });

export interface MerchantSiblingsInput {
    categoryId: string | null;
    /** Null means the ledger default; a same-currency sibling may store null or the code, so both match. */
    currency: string | null;
    defaultCurrency: string;
    discard?: (imageUri: string) => void;
    excludeId: string;
    income: boolean;
    key: string;
    persistLogo: Effect.Effect<{ imageColor: string | null; imageUri: string }, unknown> | null;
    tagIds: readonly string[];
}

interface SiblingPatch {
    categoryId?: string;
    imageColor?: string | null;
    imageUri?: string;
}

// The logo replaces a sibling's image but never an emoji, glyph or tint: those are always a choice, while an image is
// often a wrong earlier lookup. Category and tags only fill rows that have none. `imageKey` stays on a repainted row
// so the uploader can release the superseded object.
export const applyMerchantToSiblings = Effect.fn("MerchantSiblings.applyMerchantToSiblings")(
    function* applyMerchantToSiblings(db: Database, input: MerchantSiblingsInput) {
        const effective = input.currency ?? input.defaultCurrency;
        const sameCurrency =
            effective === input.defaultCurrency
                ? or(isNull(transactions.currency), eq(transactions.currency, effective))
                : eq(transactions.currency, effective);
        const recent = yield* query("scan", () =>
            db
                .select({
                    categoryId: transactions.categoryId,
                    customColor: transactions.customColor,
                    emoji: transactions.emoji,
                    icon: transactions.icon,
                    id: transactions.id,
                    income: transactions.income,
                    note: transactions.note,
                    updatedAt: transactions.updatedAt,
                })
                .from(transactions)
                .where(
                    and(
                        isNull(transactions.deletedAt),
                        ne(transactions.note, ""),
                        ne(transactions.id, input.excludeId),
                        sameCurrency
                    )
                )
                .orderBy(desc(transactions.date))
                .limit(SIBLING_WINDOW)
        );
        const siblings = recent.filter((row) => merchantKey(row.note) === input.key);

        let touched = 0;
        const { persistLogo } = input;
        // Each row persists its own logo file and the connection is shared, so the rows go one at a time.
        for (const row of siblings) {
            const patch: SiblingPatch = {};
            if (input.categoryId != null && row.categoryId == null && row.income === input.income) {
                patch.categoryId = input.categoryId;
            }
            const chosenIdentity = row.emoji != null || row.icon != null || row.customColor != null;
            if (persistLogo != null && !chosenIdentity) {
                const logo = yield* persistLogo.pipe(
                    Effect.mapError(failedAt("logo")),
                    Effect.catchTags({ MerchantSiblingsError: () => Effect.succeed(null) })
                );
                if (logo != null) {
                    patch.imageUri = logo.imageUri;
                    patch.imageColor = logo.imageColor;
                    yield* forgetLogoDismissal(db, row.id);
                }
            }
            const still = [
                eq(transactions.id, row.id),
                eq(transactions.updatedAt, row.updatedAt),
                eq(transactions.note, row.note),
            ];
            if (patch.categoryId != null) {
                still.push(isNull(transactions.categoryId));
            }
            if (patch.imageUri != null) {
                still.push(isNull(transactions.emoji), isNull(transactions.icon), isNull(transactions.customColor));
            }
            const nextStamp = new Date(Math.max(Date.now(), row.updatedAt.getTime() + 1));
            let liveStamp = row.updatedAt;
            let wrote = false;
            if (Object.keys(patch).length > 0) {
                if (patch.imageUri == null) {
                    // A category alone leaves the row bare, so its candidate stamp follows the write. Refreshed before
                    // the write, since the refresh matches against the row as it is now.
                    yield* refreshLogoCandidate(db, row.id, nextStamp.getTime());
                }
                const written = yield* query("patch", () =>
                    db
                        .update(transactions)
                        .set({
                            ...patch,
                            // Never behind the row's own clock, or sync's last-writer check drops the paint.
                            updatedAt: nextStamp,
                        })
                        .where(and(...still))
                        .returning({ id: transactions.id })
                );
                if (written.length === 0) {
                    if (patch.imageUri != null) {
                        input.discard?.(patch.imageUri);
                    }
                    continue;
                }
                liveStamp = nextStamp;
                wrote = true;
            }
            if (input.tagIds.length > 0) {
                wrote = (yield* attachTagsIfStill(db, row.id, row.note, liveStamp, input.tagIds)) || wrote;
            }
            if (wrote) {
                touched += 1;
            }
        }
        return touched;
    }
);

const attachTagsIfStill = Effect.fn("MerchantSiblings.attachTagsIfStill")(function* attachTagsIfStill(
    db: Database,
    transactionId: string,
    note: string,
    stamp: Date,
    tagIds: readonly string[]
) {
    const now = new Date();
    return yield* transaction(
        db,
        Effect.gen(function* write() {
            const still = yield* query("tags", () =>
                db
                    .select({ id: transactions.id })
                    .from(transactions)
                    .where(
                        and(
                            eq(transactions.id, transactionId),
                            eq(transactions.note, note),
                            eq(transactions.updatedAt, stamp)
                        )
                    )
                    .limit(1)
            );
            if (still.length === 0) {
                return false;
            }
            const own = yield* query("tags", () =>
                db
                    .select({ id: transactionTags.id })
                    .from(transactionTags)
                    .where(and(eq(transactionTags.transactionId, transactionId), isNull(transactionTags.deletedAt)))
                    .limit(1)
            );
            if (own.length > 0) {
                return false;
            }
            const retired = yield* query("tags", () =>
                db
                    .select({
                        deletedAt: transactionTags.deletedAt,
                        id: transactionTags.id,
                        restoredAt: transactionTags.restoredAt,
                        tagId: transactionTags.tagId,
                    })
                    .from(transactionTags)
                    .where(
                        and(
                            eq(transactionTags.transactionId, transactionId),
                            inArray(transactionTags.tagId, [...tagIds])
                        )
                    )
            );
            const revivable = new Map(retired.map((row) => [row.tagId, row]));
            // expo-sqlite's withTransactionAsync shares one connection, so statements issued concurrently inside the
            // callback interleave with the transaction boundary.
            for (const tagId of tagIds) {
                const revived = revivable.get(tagId);
                if (revived === undefined) {
                    yield* query("tags", () =>
                        db.insert(transactionTags).values({
                            deletedAt: null,
                            id: newId(),
                            tagId,
                            transactionId,
                            updatedAt: now,
                        })
                    );
                    continue;
                }
                yield* query("tags", () =>
                    db
                        .update(transactionTags)
                        .set({ deletedAt: null, restoredAt: restoreStamp(revived, now), updatedAt: now })
                        .where(eq(transactionTags.id, revived.id))
                );
            }
            return tagIds.length > 0;
        }),
        failedAt("tags")
    );
});
