import { api } from "@outlayr/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import * as Effect from "effect/Effect";
import * as Atom from "effect/reactivity/Atom";
import { useSyncExternalStore } from "react";

import { cloudRuntime } from "./cloud-runtime";
import { cloudQuery } from "./convex";
import { joinedProfilesCache, joinedSetDiffers } from "./joined-profiles";

export type ProfileMembersView = NonNullable<FunctionReturnType<typeof api.profileSharing.members>>;

export type ProfileMember = ProfileMembersView["members"][number];

export const profileInviteAtom = Atom.family((code: string) =>
    Atom.make(cloudQuery(api.profileSharing.invite, { code })).pipe(Atom.withLabel("profileSharing:invite"))
);

/** Public, so it answers before the Convex client holds a token; the signed-out key never asks. */
const NO_ACCOUNT = "";

export const profileSharingEnabledAtom = Atom.family((accountId: string) =>
    Atom.make(
        Effect.gen(function* readEnabled() {
            if (accountId === NO_ACCOUNT) {
                return false;
            }
            return yield* cloudQuery(api.profileSharing.enabled, {});
        }).pipe(Effect.catchTags({ CloudError: () => Effect.succeed(false) }))
    ).pipe(Atom.withLabel("profileSharing:enabled"))
);

const NO_PROFILE = "";

export interface ProfileMembersKey {
    authenticated: boolean;
    profileId: string;
}

/** Live per profile, shared by the Log and the members sheet, so a join or removal reaches both without a re-read. */
export const profileMembersAtom = Atom.family((key: ProfileMembersKey) =>
    Atom.make((get): ProfileMembersView | null | undefined => {
        if (!key.authenticated || key.profileId === NO_PROFILE || cloudRuntime === null) {
            return null;
        }
        const watch = cloudRuntime.convex.watchQuery(api.profileSharing.members, { profileId: key.profileId });
        const read = () => {
            try {
                return watch.localQueryResult();
            } catch {
                return null;
            }
        };
        get.addFinalizer(watch.onUpdate(() => get.setSelf(read())));
        return read();
    }).pipe(Atom.withLabel("profileSharing:members"))
);

/** Wakes the reconcile when the server's live list stops matching the cache. */
export function watchJoinedProfiles(onChange: () => void): () => void {
    if (cloudRuntime === null) {
        return () => undefined;
    }
    const watch = cloudRuntime.convex.watchQuery(api.profileSharing.joined, {});
    return watch.onUpdate(() => {
        let server: FunctionReturnType<typeof api.profileSharing.joined> | undefined;
        try {
            server = watch.localQueryResult();
        } catch {
            return;
        }
        if (server !== undefined && joinedSetDiffers(joinedProfilesCache(), server)) {
            onChange();
        }
    });
}

// Signing in remounts the navigator, so the code waits here until an account is there to claim it.
let pending: string | null = null;

const listeners = new Set<() => void>();

function notify(): void {
    for (const listener of listeners) {
        listener();
    }
}

function subscribePendingJoin(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

const currentPending = () => pending;

export function requestProfileJoin(code: string): void {
    pending = code;
    notify();
}

export function cancelProfileJoin(): void {
    if (pending === null) {
        return;
    }
    pending = null;
    notify();
}

export function takePendingProfileJoin(): string | null {
    const code = pending;
    pending = null;
    if (code !== null) {
        notify();
    }
    return code;
}

export function usePendingProfileJoin(): string | null {
    return useSyncExternalStore(subscribePendingJoin, currentPending, currentPending);
}
