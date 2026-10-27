import * as Effect from "effect/Effect";

import { sendQueuedEnrichment } from "@/data/enrichment-queue-core";
import { readBoolSetting, readRemoteEnrichment } from "@/data/settings-core";
import type { Database } from "@/db/client";
import { firstLocale } from "@/i18n/device-language";
import { createCommand, runAtomCommand, SILENT, unwrapAtomCommand } from "@/state/atom-command";
import { appAtomRegistry } from "@/state/atom-registry";

import { enrichmentQueueTransport, isCloudAuthenticated } from "./convex";

let sends: Promise<unknown> = Promise.resolve();

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

const sendOnceCommand = createCommand({ execute: sendOnce, label: "ledger:send-queued-enrichment" });

export function sendEnrichmentQueue(db: Database): void {
    sends = sends
        .then(async () => unwrapAtomCommand(await runAtomCommand(appAtomRegistry, sendOnceCommand, db, SILENT)))
        .catch((error) => {
            console.warn("[outlayr] enrichment queue send failed", error);
        });
}
