import AsyncStorage from "@react-native-async-storage/async-storage";
import { count, countDistinct, isNull, sql } from "drizzle-orm";
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as Semaphore from "effect/Semaphore";
import { isAvailableAsync, requestReview } from "expo-store-review";
import { AppState } from "react-native";

import { getMeta, META_KEYS, setMeta } from "@/data/app-meta-core";
import type { Database } from "@/db/client";
import { transactions } from "@/db/schema";
import { posthog } from "@/lib/posthog";

const ASKED_AT_KEY = "outlayr.review-asked-at";
const MIN_ENTRIES = 5;
const MIN_DAYS = 2;
// Apple and Google each cap how often the sheet shows, and a spent ask stays spent for up to a year.
const ASK_INTERVAL_MS = 120 * 24 * 60 * 60 * 1000;
const asking = Semaphore.makeUnsafe(1);

const ReviewPromptOperation = Schema.Literals(["asked-at", "ledger", "store"]);

export class ReviewPromptError extends Schema.TaggedError<ReviewPromptError>()("ReviewPromptError", {
    cause: Schema.Defect(),
    operation: ReviewPromptOperation,
}) {
    override get message(): string {
        return `Review prompt ${this.operation} failed`;
    }
}

const attempt = <A>(operation: typeof ReviewPromptOperation.Type, run: () => PromiseLike<A>) =>
    Effect.tryPromise({ catch: (cause) => new ReviewPromptError({ cause, operation }), try: run });

const engaged = Effect.fn("ReviewPrompt.engaged")(function* engaged(db: Database) {
    const [ledger] = yield* attempt("ledger", () =>
        db
            .select({
                days: countDistinct(sql`date(${transactions.updatedAt} / 1000, 'unixepoch', 'localtime')`),
                entries: count(),
            })
            .from(transactions)
            .where(isNull(transactions.deletedAt))
    );
    return (ledger?.entries ?? 0) >= MIN_ENTRIES && (ledger?.days ?? 0) >= MIN_DAYS;
});

export const askForReview = Effect.fn("ReviewPrompt.ask")(function* askForReview(db: Database) {
    if (AppState.currentState !== "active") {
        return;
    }
    const askedAt = yield* attempt("asked-at", () => AsyncStorage.getItem(ASKED_AT_KEY));
    const now = yield* Clock.currentTimeMillis;
    if (askedAt !== null && now - Number(askedAt) < ASK_INTERVAL_MS) {
        return;
    }
    if (!((yield* attempt("store", isAvailableAsync)) && (yield* engaged(db)))) {
        return;
    }
    yield* attempt("store", requestReview);
    posthog?.capture("review_prompt_requested");
    yield* attempt("asked-at", () => AsyncStorage.setItem(ASKED_AT_KEY, String(now)));
}, asking.withPermits(1));

export const askForReviewIfPending = Effect.fn("ReviewPrompt.askIfPending")(function* askForReviewIfPending(
    db: Database
) {
    if (AppState.currentState !== "active" || (yield* getMeta(db, META_KEYS.reviewPending)) !== "1") {
        return;
    }
    yield* setMeta(db, META_KEYS.reviewPending, "0");
    yield* askForReview(db);
});
