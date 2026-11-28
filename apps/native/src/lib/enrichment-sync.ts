import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as HttpClient from "effect/http/HttpClient";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";

import { subscribeToSettingChanges } from "@/data/database-changes";
import { applyEnrichmentAnswer } from "@/data/enrichment-queue-core";
import type { AnsweredJob } from "@/data/enrichment-queue-core";
import { drainDevicePendingWrites } from "@/data/pending-writes";
import type { Database } from "@/db/client";
import { persistLogo } from "@/lib/persist-logo";

import { appStates, launchAndForegrounds, listen, signals, WatchAppState } from "./app-events";
import { syncCaptureLookup } from "./capture-lookup";
import { enrichmentQueueTransport, watchEnrichmentResults } from "./cloud-enrichment-queue";
import { subscribeCloudAuthenticated } from "./convex";
import { sendEnrichmentQueue } from "./enrichment-queue";
import { discardLogo } from "./logo-backfill";
import { fetchMerchantImage } from "./logo-fetch";
import { syncReviewPush } from "./review-push";

const EnrichmentStep = Schema.Literals(["apply", "settle"]);

const FAILED: Record<typeof EnrichmentStep.Type, string> = {
    apply: "Enrichment answer failed to apply",
    settle: "Enrichment answers failed to settle",
};

export class EnrichmentSyncError extends Schema.TaggedError<EnrichmentSyncError>()("EnrichmentSyncError", {
    cause: Schema.Defect(),
    message: Schema.String,
    step: EnrichmentStep,
}) {}

// A Wallet capture's answer can arrive before its row is filed, and an answer with no row is acked away.
const defaultResults = {
    ack: (localIds: string[]) => enrichmentQueueTransport().ack(localIds),
    apply: Effect.fn("EnrichmentResults.apply")(function* apply(db: Database, job: AnsweredJob) {
        const http = yield* HttpClient.HttpClient;
        return yield* applyEnrichmentAnswer(db, job, {
            discard: discardLogo,
            fetchImage: (request) =>
                fetchMerchantImage(request).pipe(Effect.provideService(HttpClient.HttpClient, http)),
            persist: persistLogo,
        });
    }),
    drain: drainDevicePendingWrites,
    watch: watchEnrichmentResults,
};

export const EnrichmentResults = Context.Reference<typeof defaultResults>(
    "outlayr/lib/EnrichmentSync/EnrichmentResults",
    { defaultValue: () => defaultResults }
);

export class EnrichmentSync extends Context.Service<
    EnrichmentSync,
    { readonly run: (db: Database) => Effect.Effect<void> }
>()("outlayr/lib/EnrichmentSync") {}

const failedAt = (step: typeof EnrichmentStep.Type) => (cause: unknown) =>
    new EnrichmentSyncError({ cause, message: FAILED[step], step });

const warn = (error: EnrichmentSyncError) => Effect.logWarning(error.message, error.cause);

export const make = Effect.gen(function* make() {
    const results = yield* EnrichmentResults;
    const watchAppState = yield* WatchAppState;
    const http = yield* HttpClient.HttpClient;

    const run = Effect.fn("EnrichmentSync.run")(function* run(db: Database) {
        const settle = (jobs: AnsweredJob[]) =>
            // Answers for one merchant may create the same category or tag, and `ensure*` only dedupes when they land
            // one at a time.
            results.drain(db).pipe(
                Effect.andThen(
                    Effect.all(
                        jobs.map((job) =>
                            results
                                .apply(db, job)
                                .pipe(
                                    Effect.provideService(HttpClient.HttpClient, http),
                                    Effect.mapError(failedAt("apply")),
                                    Effect.catchTags({ EnrichmentSyncError: warn })
                                )
                        ),
                        { discard: true }
                    ).pipe(
                        Effect.andThen(
                            results
                                .ack(jobs.map((job) => job.localId))
                                .pipe(
                                    Effect.mapError(failedAt("settle")),
                                    Effect.catchTags({ EnrichmentSyncError: warn })
                                )
                        ),
                        Effect.uninterruptible
                    )
                ),
                // Unacked, the answers come back on the next watch, after a drain that filed their rows.
                Effect.catchCause((cause) => Effect.logWarning("[outlayr] drain before answers failed", cause))
            );

        yield* Effect.all(
            [
                listen(results.watch).pipe(Stream.runForEach(settle)),
                launchAndForegrounds(watchAppState).pipe(Stream.runForEach(() => sendEnrichmentQueue(db))),
                Stream.mergeAll(
                    [
                        launchAndForegrounds(watchAppState),
                        appStates(watchAppState, "background"),
                        signals(subscribeCloudAuthenticated),
                        signals((listener) =>
                            subscribeToSettingChanges(db, listener, [
                                "aiConsentV2",
                                "aiEnrichment",
                                "groundedLookup",
                                "reviewAlerts",
                            ])
                        ),
                    ],
                    { concurrency: "unbounded" }
                ).pipe(
                    Stream.runForEach(() => Effect.all([syncCaptureLookup(db), syncReviewPush(db)], { discard: true }))
                ),
            ],
            { concurrency: "unbounded", discard: true }
        );
    });

    return EnrichmentSync.of({ run });
});

export const layer = Layer.effect(EnrichmentSync, make);
