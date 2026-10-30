import { EnrichmentResult } from "@outlayr/backend/confect/lib/enrichmentResult";
import { api } from "@outlayr/backend/convex/_generated/api";
import type * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import type { AnsweredJob, EnrichmentJobRequest } from "@/data/enrichment-queue-core";

import type { CloudError } from "./cloud-error";
import { cloudRuntime } from "./cloud-runtime";
import { aiConsentArgs, cloudMutation } from "./convex";

const decodeAnsweredJobs = Schema.decodeUnknownOption(
    Schema.mutable(
        Schema.Array(
            Schema.Struct({
                localId: Schema.String,
                name: Schema.String,
                result: Schema.NullOr(EnrichmentResult),
            })
        )
    )
);

export interface EnrichmentQueueTransport {
    ack: (localIds: string[]) => Effect.Effect<null, CloudError>;
    enqueue: (request: EnrichmentJobRequest) => Effect.Effect<boolean, CloudError>;
}

export function enrichmentQueueTransport(): EnrichmentQueueTransport {
    return {
        ack: (localIds) => cloudMutation(api.enrichmentQueue.ack, { localIds }),
        enqueue: (request) => cloudMutation(api.enrichmentQueue.enqueue, { ...request, ...aiConsentArgs() }),
    };
}

export function watchEnrichmentResults(onJobs: (jobs: AnsweredJob[]) => void): () => void {
    if (cloudRuntime === null) {
        return () => undefined;
    }
    const watch = cloudRuntime.convex.watchQuery(api.enrichmentQueue.results, {});
    return watch.onUpdate(() => {
        let jobs: ReturnType<typeof decodeAnsweredJobs> | null = null;
        try {
            jobs = decodeAnsweredJobs(watch.localQueryResult());
        } catch {
            jobs = null;
        }
        if (jobs !== null && Option.isSome(jobs) && jobs.value.length > 0) {
            onJobs(jobs.value);
        }
    });
}
