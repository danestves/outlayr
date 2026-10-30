import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Semaphore from "effect/Semaphore";

import { sendQueuedEnrichment } from "@/data/enrichment-queue-core";
import { readBoolSetting, readRemoteEnrichment } from "@/data/settings-core";
import type { Database } from "@/db/client";
import { firstLocale } from "@/i18n/device-language";

import { enrichmentQueueTransport } from "./cloud-enrichment-queue";
import { isCloudAuthenticated } from "./convex";

const lane = Semaphore.makeUnsafe(1);

const sendOnce = Effect.fn("EnrichmentQueue.sendOnce")(function* sendOnce(db: Database) {
    if (!isCloudAuthenticated() || !(yield* readRemoteEnrichment(db))) {
        return 0;
    }
    const device = firstLocale();
    return yield* sendQueuedEnrichment(db, {
        enqueue: enrichmentQueueTransport().enqueue,
        groundedLookup: yield* readBoolSetting(db, "groundedLookup"),
        locale: device?.languageTag?.trim() || undefined,
        regionCode: device?.regionCode?.trim() || undefined,
    });
});

export const sendEnrichmentQueue = (db: Database) =>
    sendOnce(db).pipe(
        lane.withPermits(1),
        Effect.catchCause((cause) => Effect.logWarning("Enrichment queue send failed", Cause.squash(cause))),
        Effect.forkDetach,
        Effect.asVoid
    );
