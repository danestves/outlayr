import * as Effect from "effect/Effect";

import { sendQueuedEnrichment } from "@/data/enrichment-queue-core";
import { readBoolSetting, readRemoteEnrichment } from "@/data/settings-core";
import type { Database } from "@/db/client";
import { firstLocale } from "@/i18n/device-language";

import { enrichmentQueueTransport, isCloudAuthenticated } from "./convex";

let sends: Promise<unknown> = Promise.resolve();

async function sendOnce(db: Database): Promise<number> {
    if (!isCloudAuthenticated() || !(await readRemoteEnrichment(db))) {
        return 0;
    }
    const device = firstLocale();
    return Effect.runPromise(
        sendQueuedEnrichment(db, {
            enqueue: enrichmentQueueTransport().enqueue,
            groundedLookup: await readBoolSetting(db, "groundedLookup"),
            locale: device?.languageTag?.trim() || undefined,
            regionCode: device?.regionCode?.trim() || undefined,
        })
    );
}

export function sendEnrichmentQueue(db: Database): void {
    sends = sends
        .then(() => sendOnce(db))
        .catch((error) => {
            console.warn("[outlayr] enrichment queue send failed", error);
        });
}
