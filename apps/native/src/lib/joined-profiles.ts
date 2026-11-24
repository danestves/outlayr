import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { File, Paths } from "expo-file-system";
import { useSyncExternalStore } from "react";

import { clearDurably, readDurably, writeDurably } from "./durable-file";

// Joined ledgers never enter the profiles registry: that table syncs to the member's own account.
const joinedProfilesFile = () => new File(Paths.document, "joined-profiles");

const SharedProfileLook = Schema.Struct({
    customColor: Schema.NullOr(Schema.String),
    emoji: Schema.NullOr(Schema.String),
    icon: Schema.NullOr(Schema.String),
    imageColor: Schema.NullOr(Schema.String),
    imageKey: Schema.NullOr(Schema.String),
    name: Schema.String,
});

/** Mirrors `SharedProfileLook` in `packages/backend/confect/lib/syncTables.ts`. */
export type SharedProfileLook = typeof SharedProfileLook.Type;

const JoinedProfile = Schema.Struct({
    joinedAt: Schema.Finite,
    look: SharedProfileLook,
    ownerName: Schema.NullOr(Schema.String),
    profileId: Schema.String,
});

export type JoinedProfile = typeof JoinedProfile.Type;

const JoinedProfilesCache = Schema.Struct({
    departed: Schema.Array(Schema.String),
    joined: Schema.Array(JoinedProfile),
});

export type JoinedProfilesCache = typeof JoinedProfilesCache.Type;

export interface JoinedReconcilePlan {
    readonly cache: JoinedProfilesCache;
    readonly droppedActive: boolean;
}

const emptyCache = (): JoinedProfilesCache => ({ departed: [], joined: [] });

const decodeCache = Schema.decodeUnknownOption(JoinedProfilesCache);

let cache: JoinedProfilesCache | null = null;

// Garbled or missing reads as empty, like the active profile: a half-written cache must not route a switch.
export function joinedProfilesCache(): JoinedProfilesCache {
    if (cache === null) {
        try {
            const text = readDurably(joinedProfilesFile());
            cache = text === null ? emptyCache() : Option.getOrElse(decodeCache(JSON.parse(text)), emptyCache);
        } catch {
            cache = emptyCache();
        }
    }
    return cache;
}

export function joinedProfiles(): readonly JoinedProfile[] {
    return joinedProfilesCache().joined;
}

export function isJoinedProfile(profileId: string): boolean {
    return joinedProfilesCache().joined.some((entry) => entry.profileId === profileId);
}

const listeners = new Set<() => void>();

export function subscribeJoinedProfiles(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function writeJoinedProfiles(next: JoinedProfilesCache): void {
    const file = joinedProfilesFile();
    if (next.joined.length === 0 && next.departed.length === 0) {
        clearDurably(file);
    } else {
        writeDurably(file, JSON.stringify(next));
    }
    cache = next;
    for (const listener of listeners) {
        listener();
    }
}

export function useJoinedProfiles(): readonly JoinedProfile[] {
    return useSyncExternalStore(subscribeJoinedProfiles, joinedProfiles, joinedProfiles);
}

const reconcileListeners = new Set<() => void>();

/** The sync transport cannot import state, so it reports a refused ledger and the runtime reconciles it. */
export function requestJoinedReconcile(): void {
    for (const listener of reconcileListeners) {
        listener();
    }
}

export function subscribeJoinedReconcile(listener: () => void): () => void {
    reconcileListeners.add(listener);
    return () => {
        reconcileListeners.delete(listener);
    };
}

export function planJoinedReconcile(
    current: JoinedProfilesCache,
    serverJoined: readonly JoinedProfile[],
    activeId: string | undefined
): JoinedReconcilePlan {
    const serverIds = new Set(serverJoined.map((entry) => entry.profileId));
    const left = current.joined.filter((entry) => !serverIds.has(entry.profileId)).map((entry) => entry.profileId);
    return {
        cache: {
            departed: [...new Set([...current.departed, ...left])].filter((id) => !serverIds.has(id)),
            joined: serverJoined.map(({ joinedAt, look, ownerName, profileId }) => ({
                joinedAt,
                look,
                ownerName,
                profileId,
            })),
        },
        droppedActive:
            activeId !== undefined &&
            current.joined.some((entry) => entry.profileId === activeId) &&
            !serverIds.has(activeId),
    };
}
