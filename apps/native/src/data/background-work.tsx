import { useAtomValue } from "@effect/atom-react/Hooks";
import * as Effect from "effect/Effect";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as Atom from "effect/reactivity/Atom";

import { useDatabase } from "@/contexts/local-data-context";
import { SyncEngineMount } from "@/data/sync-engine-mount";
import { useProEntitled } from "@/hooks/use-pro-locked";
import { activeProfileId } from "@/lib/active-profile";
import { useAuthSession } from "@/lib/auth-session";
import { useCloudAuthenticated } from "@/lib/convex";
import { isJoinedProfile } from "@/lib/joined-profiles";

import {
    BackgroundProgramMount,
    EnrichmentSyncMount,
    JoinedProfilesMount,
    PhotoSyncMount,
} from "./background-work-mount";

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
).pipe(Atom.withLabel("background-work:idle-start"));

export function BackgroundWork() {
    const db = useDatabase();
    const started = AsyncResult.isSuccess(useAtomValue(idleStartAtom));
    const proEntitled = useProEntitled();
    const cloudAuthenticated = useCloudAuthenticated();
    const { accountId } = useAuthSession();

    if (!started) {
        return null;
    }
    // Held down without a confirmed entitlement and session: the server refuses a lapsed customer and a missing token.
    // A guest's purchase opens AI but not sync, which needs an account to restore the ledger to. A joined profile rides
    // the owner's Pro, which the server checks.
    const active = activeProfileId();
    const joinedProfile = active !== undefined && isJoinedProfile(active);
    const cloudPaused = (!proEntitled && !joinedProfile) || !cloudAuthenticated || accountId === null;
    const enrichmentOn = cloudAuthenticated && (accountId !== null || proEntitled);

    return (
        <>
            <BackgroundProgramMount db={db} />
            {enrichmentOn ? <EnrichmentSyncMount db={db} /> : null}
            {cloudAuthenticated && accountId !== null ? <JoinedProfilesMount /> : null}
            {cloudPaused ? null : <PhotoSyncMount db={db} />}
            {cloudPaused ? null : <SyncEngineMount db={db} />}
        </>
    );
}
