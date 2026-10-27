import AsyncStorage from "@react-native-async-storage/async-storage";
import { count, countDistinct, isNull, sql } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { isAvailableAsync, requestReview } from "expo-store-review";
import { AppState } from "react-native";

import type { Database } from "@/db/client";
import { transactions } from "@/db/schema";

import { APP_VERSION } from "./app-version";

const ASKED_VERSION_KEY = "outlayr.review-asked-version";
const MIN_ENTRIES = 10;
const MIN_DAYS = 3;

const ReviewPromptOperation = Schema.Literals(["ledger", "store", "version"]);

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
    if ((yield* attempt("version", () => AsyncStorage.getItem(ASKED_VERSION_KEY))) === APP_VERSION) {
        return;
    }
    if (!((yield* attempt("store", isAvailableAsync)) && (yield* engaged(db)))) {
        return;
    }
    yield* attempt("version", () => AsyncStorage.setItem(ASKED_VERSION_KEY, APP_VERSION));
    yield* attempt("store", requestReview);
});
