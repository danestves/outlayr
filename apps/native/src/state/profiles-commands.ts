import * as Effect from "effect/Effect";
import { reloadAsync } from "expo-updates";
import { DevSettings } from "react-native";

import { drainDevicePendingWritesOrFail } from "@/data/pending-writes";
import { profileLedgerExists } from "@/data/profile-ledger-files";
import { profileRegistry } from "@/data/profile-registry";
import { createProfile, deleteProfile, prepareProfileLedger } from "@/data/profiles";
import { ProfilesError, updateProfile } from "@/data/profiles-core";
import type { ProfileIdentity } from "@/data/profiles-core";
import { flushDeferredDeletes } from "@/data/use-deferred-delete";
import type { Database } from "@/db/client";
import { activeProfileId, writeActiveProfile } from "@/lib/active-profile";
import { appRuntime } from "@/lib/runtime";

import { createRuntimeCommand } from "./atom-command";

const switchFailed = (cause: unknown) => new ProfilesError({ cause, operation: "switch" });

// A queued capture carries ids from the open ledger, so a failed drain stays put rather than land in the next one.
const settleLedger = Effect.fn("Profiles.settleLedger")(function* settleLedger(db: Database) {
    yield* flushDeferredDeletes;
    yield* drainDevicePendingWritesOrFail(db).pipe(Effect.mapError(switchFailed));
});

const reload = Effect.suspend(() => {
    if (__DEV__) {
        DevSettings.reload();
        return Effect.void;
    }
    return Effect.tryPromise({ catch: switchFailed, try: () => reloadAsync() });
});

const enter = Effect.fn("Profiles.enter")(function* enter(profileId: string | undefined) {
    yield* Effect.try({ catch: switchFailed, try: () => writeActiveProfile(profileId) });
    yield* reload;
});

// Runs before sync is turned off, so a failed drain leaves the session and its outbox untouched for a retry.
export const settleBeforeSignOut = (db: Database) =>
    Effect.suspend(() => (activeProfileId() === undefined ? Effect.void : settleLedger(db)));

// The auth client can drop the local session even when its request fails, so the device lands on Personal either way.
export const signOutToPersonal = Effect.fn("Profiles.signOutToPersonal")(function* signOutToPersonal<E>(
    signOut: Effect.Effect<void, E>
) {
    if (activeProfileId() === undefined) {
        return yield* signOut;
    }
    yield* Effect.try({ catch: switchFailed, try: () => writeActiveProfile(undefined) });
    yield* signOut.pipe(Effect.ensuring(reload.pipe(Effect.ignore)));
});

export const switchProfileCommand = createRuntimeCommand(appRuntime, {
    execute: Effect.fn("Profiles.switch")(function* switchProfile(input: {
        from: Database;
        profileId: string | undefined;
    }) {
        if (input.profileId !== undefined && !profileLedgerExists(input.profileId)) {
            // Migrate, bootstrap and seed are idempotent, so finishing in place keeps what the ledger holds.
            yield* prepareProfileLedger(input.profileId, input.from, undefined);
        }
        yield* settleLedger(input.from);
        yield* enter(input.profileId);
    }),
    label: "profiles:switch",
});

export const createProfileCommand = createRuntimeCommand(appRuntime, {
    execute: Effect.fn("Profiles.createAndSwitch")(function* createAndSwitch(input: {
        currency: string;
        from: Database;
        identity: ProfileIdentity;
        name: string;
    }) {
        // Before the registry row, so a failed drain can be retried without making a second profile.
        yield* settleLedger(input.from);
        yield* enter(yield* createProfile(input));
    }),
    label: "profiles:create",
});

export const saveProfileCommand = createRuntimeCommand(appRuntime, {
    execute: (input: { id: string; identity: ProfileIdentity; name: string }) =>
        updateProfile(profileRegistry(), input.id, { ...input.identity, name: input.name }),
    label: "profiles:save",
});

export const deleteProfileCommand = createRuntimeCommand(appRuntime, {
    execute: Effect.fn("Profiles.deleteAndLeave")(function* deleteAndLeave(id: string) {
        yield* flushDeferredDeletes;
        yield* deleteProfile(id);
        yield* enter(undefined);
    }),
    label: "profiles:delete",
});
