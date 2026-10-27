import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as HttpClient from "effect/http/HttpClient";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";

import { applyEnrichmentAnswer } from "@/data/enrichment-queue-core";
import type { AnsweredJob } from "@/data/enrichment-queue-core";
import type { Database } from "@/db/client";
import { persistLogo } from "@/lib/persist-logo";

import { launchAndForegrounds, listen, WatchAppState } from "./app-events";
import type { Watch } from "./app-events";
import type { CloudError } from "./cloud-error";
import { enrichmentQueueTransport, watchEnrichmentResults } from "./convex";
import { sendEnrichmentQueue } from "./enrichment-queue";
import { discardLogo } from "./logo-backfill";
import { fetchMerchantImage } from "./logo-fetch";

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

export const EnrichmentResults = Context.Reference<{
    readonly ack: (localIds: string[]) => Effect.Effect<null, CloudError>;
    readonly apply: (db: Database, job: AnsweredJob) => Effect.Effect<void, unknown, HttpClient.HttpClient>;
    readonly watch: Watch<AnsweredJob[]>;
}>("outlayr/lib/EnrichmentSync/EnrichmentResults", {
    defaultValue: () => ({
        ack: (localIds) => enrichmentQueueTransport().ack(localIds),
        apply: Effect.fn("EnrichmentResults.apply")(function* apply(db, job) {
            const http = yield* HttpClient.HttpClient;
            return yield* applyEnrichmentAnswer(db, job, {
                discard: discardLogo,
                fetchImage: (request) =>
                    fetchMerchantImage(request).pipe(Effect.provideService(HttpClient.HttpClient, http)),
                persist: persistLogo,
            });
        }),
        watch: watchEnrichmentResults,
    }),
});

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
                        .pipe(Effect.mapError(failedAt("settle")), Effect.catchTags({ EnrichmentSyncError: warn }))
                ),
                Effect.uninterruptible
            );

        yield* Effect.all(
            [
                listen(results.watch).pipe(Stream.runForEach(settle)),
                launchAndForegrounds(watchAppState).pipe(Stream.runForEach(() => sendEnrichmentQueue(db))),
            ],
            { concurrency: "unbounded", discard: true }
        );
    });

    return EnrichmentSync.of({ run });
});

export const layer = Layer.effect(EnrichmentSync, make);
