import { useAtomValue } from "@effect/atom-react/Hooks";
import * as Effect from "effect/Effect";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as Atom from "effect/reactivity/Atom";

import { useDatabase } from "@/contexts/local-data-context";
import { SyncEngineMount } from "@/data/sync-engine-mount";
import { useProEntitled } from "@/hooks/use-pro-locked";
import { useCloudAuthenticated } from "@/lib/convex";

import { BackgroundProgramMount, EnrichmentSyncMount, PhotoSyncMount } from "./background-work-mount";

const IDLE_TIMEOUT_MS = 1000;

const idleStartAtom = Atom.make(
    Effect.callback<boolean>((resume) => {
        const handle = requestIdleCallback(
            () => {
                resume(Effect.succeed(true));
            },
            { timeout: IDLE_TIMEOUT_MS }
        );
        return Effect.sync(() => {
            cancelIdleCallback(handle);
        });
    })
);

export function BackgroundWork() {
    const db = useDatabase();
    const started = AsyncResult.isSuccess(useAtomValue(idleStartAtom));
    const proEntitled = useProEntitled();
    const cloudAuthenticated = useCloudAuthenticated();

    if (!started) {
        return null;
    }
    // Held down without a confirmed entitlement and session: the server refuses a lapsed customer and a missing token.
    const cloudPaused = !proEntitled || !cloudAuthenticated;

    return (
        <>
            <BackgroundProgramMount db={db} />
            {cloudAuthenticated ? <EnrichmentSyncMount db={db} /> : null}
            {cloudPaused ? null : <PhotoSyncMount db={db} />}
            {cloudPaused ? null : <SyncEngineMount db={db} />}
        </>
    );
}
