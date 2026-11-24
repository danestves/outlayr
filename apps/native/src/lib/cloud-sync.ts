import { api } from "@outlayr/backend/convex/_generated/api";
import { ConvexError } from "convex/values";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import type { PullFn, PushFn } from "@/data/sync-engine-core";
import { profileArgs } from "@/domain/profiles";

import { activeProfileId } from "./active-profile";
import type { CloudError } from "./cloud-error";
import { cloudRuntime } from "./cloud-runtime";
import { cloudMutation, cloudQuery } from "./convex";
import { isJoinedProfile, requestJoinedReconcile } from "./joined-profiles";

export interface SyncTransport {
    pull: PullFn;
    push: PushFn;
}

const NOT_PROFILE_MEMBER = "NOT_PROFILE_MEMBER";

const decodeCode = Schema.decodeUnknownOption(Schema.Struct({ code: Schema.String }));

const membershipLost = (error: CloudError) =>
    error.cause instanceof ConvexError &&
    Option.exists(decodeCode(error.cause.data), (data) => data.code === NOT_PROFILE_MEMBER);

// The transport cannot import state, so the runtime atom that owns reconciliation listens for this signal.
const noteMembershipLost = (error: CloudError) =>
    Effect.sync(() => {
        const active = activeProfileId();
        if (membershipLost(error) && active !== undefined && isJoinedProfile(active)) {
            requestJoinedReconcile();
        }
    });

const watched = <A>(call: Effect.Effect<A, CloudError>) => call.pipe(Effect.tapError(noteMembershipLost));

export function syncTransport(): SyncTransport {
    return {
        pull: (args) => watched(cloudQuery("sync:pullSince", { ...args, ...profileArgs(activeProfileId()) })),
        push: (args) => watched(cloudMutation("sync:push", { ...args, ...profileArgs(activeProfileId()) })),
    };
}

const isWatermark = Schema.is(Schema.Finite);

export function watchSyncWatermark(onWatermark: (watermark: number) => void): () => void {
    if (cloudRuntime === null) {
        return () => undefined;
    }
    const watch = cloudRuntime.convex.watchQuery(api.sync.currentSeq, profileArgs(activeProfileId()));
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
