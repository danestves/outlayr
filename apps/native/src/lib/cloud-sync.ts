import { api } from "@outlayr/backend/convex/_generated/api";
import * as Schema from "effect/Schema";

import type { PullFn, PushFn } from "@/data/sync-engine-core";

import { cloudRuntime } from "./cloud-runtime";
import { cloudMutation, cloudQuery } from "./convex";

export interface SyncTransport {
    pull: PullFn;
    push: PushFn;
}

export function syncTransport(): SyncTransport {
    return {
        pull: (args) => cloudQuery("sync:pullSince", args),
        push: (args) => cloudMutation("sync:push", args),
    };
}

const isWatermark = Schema.is(Schema.Finite);

export function watchSyncWatermark(onWatermark: (watermark: number) => void): () => void {
    if (cloudRuntime === null) {
        return () => undefined;
    }
    const watch = cloudRuntime.convex.watchQuery(api.sync.currentSeq, {});
    return watch.onUpdate(() => {
        try {
            const watermark = watch.localQueryResult();
            if (isWatermark(watermark)) {
                onWatermark(watermark);
            }
        } catch {
            // Refused while signed out; the same socket delivers a value once a token is set, so stay subscribed.
        }
    });
}
