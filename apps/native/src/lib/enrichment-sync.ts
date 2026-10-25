import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";

import { applyEnrichmentAnswer } from "@/data/enrichment-queue-core";
import type { AnsweredJob } from "@/data/enrichment-queue-core";
import type { Database } from "@/db/client";
import { persistLogo } from "@/lib/persist-logo";

import { launchAndForegrounds, listen, WatchAppState } from "./app-events";
import type { Watch } from "./app-events";
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
    readonly ack: (localIds: string[]) => Promise<null>;
    readonly apply: (db: Database, job: AnsweredJob) => Promise<void>;
    readonly watch: Watch<AnsweredJob[]>;
}>("outlayr/lib/EnrichmentSync/EnrichmentResults", {
    defaultValue: () => ({
        ack: (localIds) => enrichmentQueueTransport().ack(localIds),
        apply: (db, job) =>
            applyEnrichmentAnswer(db, job, {
                discard: discardLogo,
                fetchImage: fetchMerchantImage,
                persist: persistLogo,
            }),
        watch: watchEnrichmentResults,
    }),
});

export class EnrichmentSync extends Context.Service<
    EnrichmentSync,
    { readonly run: (db: Database) => Effect.Effect<void> }
>()("outlayr/lib/EnrichmentSync") {}

const attempt = <A>(step: typeof EnrichmentStep.Type, task: () => Promise<A>) =>
    Effect.tryPromise({
        catch: (cause) => new EnrichmentSyncError({ cause, message: FAILED[step], step }),
        try: task,
    }).pipe(Effect.catchTags({ EnrichmentSyncError: (error) => Effect.logWarning(error.message, error.cause) }));

export const make = Effect.gen(function* make() {
    const results = yield* EnrichmentResults;
    const watchAppState = yield* WatchAppState;

    const run = Effect.fn("EnrichmentSync.run")(function* run(db: Database) {
        const settle = (jobs: AnsweredJob[]) =>
            // Answers for one merchant may create the same category or tag, and `ensure*` only dedupes when they land
            // one at a time.
            Effect.all(
                jobs.map((job) => attempt("apply", () => results.apply(db, job))),
                { discard: true }
            ).pipe(
                Effect.andThen(attempt("settle", () => results.ack(jobs.map((job) => job.localId)))),
                Effect.uninterruptible
            );

        yield* Effect.all(
            [
                listen(results.watch).pipe(Stream.runForEach(settle)),
                launchAndForegrounds(watchAppState).pipe(
                    Stream.runForEach(() =>
                        Effect.sync(() => {
                            sendEnrichmentQueue(db);
                        })
                    )
                ),
            ],
            { concurrency: "unbounded", discard: true }
        );
    });

    return EnrichmentSync.of({ run });
});

export const layer = Layer.effect(EnrichmentSync, make);
