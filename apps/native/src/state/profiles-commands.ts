import * as Effect from "effect/Effect";
import { reloadAsync } from "expo-updates";
import { DevSettings } from "react-native";

import { acquireDrains, closeDrains, drainDevicePendingWritesOrFail, reopenDrains } from "@/data/pending-writes";
import { profileLedgerExists } from "@/data/profile-ledger-files";
import { profileRegistry } from "@/data/profile-registry";
import { createProfile, deleteProfile, prepareProfileLedger } from "@/data/profiles";
import { profileIsLive, ProfilesError, updateProfile } from "@/data/profiles-core";
import type { ProfileIdentity } from "@/data/profiles-core";
import { flushDeferredDeletes } from "@/data/use-deferred-delete";
import type { Database } from "@/db/client";
import {
    activeProfileId,
    readProfileSwitch,
    recordProfileSwitch,
    retargetProfileSwitch,
    writeActiveProfile,
    writeProfileSwitch,
} from "@/lib/active-profile";
import type { ProfileSwitch } from "@/lib/active-profile";
import { isJoinedProfile } from "@/lib/joined-profiles";
import { appRuntime } from "@/lib/runtime";

import { createRuntimeCommand } from "./atom-command";

export const switchFailed = (cause: unknown) => new ProfilesError({ cause, operation: "switch" });

// Once the active file names Personal this runtime has left its ledger: the reload lands there, so the drains stay
// shut even when the auth request fails.
let leftLedger = false;

// A queued capture carries ids from the open ledger, so a failed drain stays put rather than land in the next one.
export const settleLedger = Effect.fn("Profiles.settleLedger")(function* settleLedger(db: Database) {
    // Only the transition that closed the gate may drain or reopen it: a second one, like a switch tapped mid sign-out,
    // would run its strict pass against the ledger that transition is already leaving.
    if (!acquireDrains()) {
        return yield* switchFailed(new Error("another profile transition still holds the drains shut"));
    }
    leftLedger = false;
    yield* Effect.gen(function* settle() {
        yield* closeDrains();
        yield* flushDeferredDeletes;
        yield* drainDevicePendingWritesOrFail(db).pipe(Effect.mapError(switchFailed));
    }).pipe(Effect.onError(() => Effect.sync(reopenDrains)));
});

export const reload = Effect.suspend(() => {
    if (__DEV__) {
        DevSettings.reload();
        return Effect.void;
    }
    return Effect.tryPromise({ catch: switchFailed, try: () => reloadAsync() });
});

export const writeActive = (profileId: string | undefined) =>
    Effect.try({ catch: switchFailed, try: () => writeActiveProfile(profileId) });

// The file, the marker and the drains go back together, so a retry starts from the launch profile.
const restoreLaunchProfile = Effect.fn("Profiles.restoreLaunchProfile")(function* restoreLaunchProfile(
    previous: readonly ProfileSwitch[]
) {
    yield* Effect.try({ catch: switchFailed, try: () => writeActiveProfile(activeProfileId()) }).pipe(Effect.ignore);
    // A launch still inside its own switch's grace keeps parking that switch's late captures.
    yield* Effect.try({ catch: switchFailed, try: () => writeProfileSwitch(previous) }).pipe(Effect.ignore);
    reopenDrains();
});

export const withRollback = <A, E>(run: Effect.Effect<A, E>) =>
    Effect.suspend(() => {
        const previous = readProfileSwitch();
        return run.pipe(
            Effect.catch((error) => restoreLaunchProfile(previous).pipe(Effect.andThen(Effect.fail(error))))
        );
    });

/**
 * A marker first, so a capture enqueued after the drain is held for the ledger being left rather than landing in
 * the next one. Drains stay shut until the reload, or a capture-triggered pass could still file there.
 */
export const enter = Effect.fn("Profiles.enter")(function* enter(profileId: string | undefined) {
    yield* Effect.try({ catch: switchFailed, try: recordProfileSwitch });
    yield* writeActive(profileId);
    yield* reload;
});

// Runs before sync is turned off, so a failed drain leaves the session and its outbox untouched for a retry. True when
// this sign-out took the drain gate, so only it may reopen the gate.
export const settleBeforeSignOut = (db: Database) =>
    Effect.suspend(() =>
        activeProfileId() === undefined ? Effect.succeed(false) : settleLedger(db).pipe(Effect.as(true))
    );

/** A sign-out that fails before the active file moves must not leave the drains shut for the rest of the run. */
export const reopenDrainsIfStillInLedger = Effect.sync(() => {
    if (!leftLedger) {
        reopenDrains();
    }
});

// The auth client can drop the local session even when its request fails, so the device lands on Personal either way.
export const signOutToPersonal = Effect.fn("Profiles.signOutToPersonal")(function* signOutToPersonal<E>(
    signOut: Effect.Effect<void, E>
) {
    if (activeProfileId() === undefined) {
        return yield* signOut;
    }
    const previous = readProfileSwitch();
    yield* Effect.gen(function* leaveLedger() {
        yield* Effect.try({ catch: switchFailed, try: recordProfileSwitch });
        yield* writeActive(undefined);
        leftLedger = true;
    }).pipe(Effect.catch((error) => restoreLaunchProfile(previous).pipe(Effect.andThen(Effect.fail(error)))));
    yield* signOut.pipe(Effect.ensuring(reload.pipe(Effect.ignore)));
});

export const switchProfileCommand = createRuntimeCommand(appRuntime, {
    execute: Effect.fn("Profiles.switch")(function* switchProfile(input: {
        from: Database;
        profileId: string | undefined;
    }) {
        if (input.profileId !== undefined && !profileLedgerExists(input.profileId)) {
            // Migrate, bootstrap and seed are idempotent, so finishing in place keeps what the ledger holds.
            yield* prepareProfileLedger(
                input.profileId,
                input.from,
                undefined,
                isJoinedProfile(input.profileId) ? { seedCategories: false } : undefined
            );
        }
        yield* settleLedger(input.from);
        // Settling can let sync tombstone the profile this switch set out to open, or reconcile drop a joined one.
        yield* Effect.gen(function* guardTarget() {
            if (input.profileId !== undefined) {
                const live =
                    (yield* profileIsLive(profileRegistry(), input.profileId)) || isJoinedProfile(input.profileId);
                if (!live) {
                    return yield* switchFailed(new Error("profile was deleted"));
                }
            }
        }).pipe(Effect.onError(() => Effect.sync(reopenDrains)));
        yield* withRollback(enter(input.profileId));
    }),
    label: "profiles:switch",
});

export const createProfileCommand = createRuntimeCommand(appRuntime, {
    execute: Effect.fn("Profiles.createAndSwitch")(function* createAndSwitch(input: {
        currency: string;
        from: Database;
        id: string;
        identity: ProfileIdentity;
        name: string;
    }) {
        // Before the registry row, so a failed drain can be retried without making a second profile.
        yield* settleLedger(input.from);
        yield* withRollback(
            Effect.gen(function* createAndEnter() {
                yield* enter(yield* createProfile(input));
            })
        );
    }),
    label: "profiles:create",
});

export const saveProfileCommand = createRuntimeCommand(appRuntime, {
    execute: (input: { id: string; identity: ProfileIdentity; name: string }) =>
        updateProfile(profileRegistry(), input.id, { ...input.identity, name: input.name }),
    label: "profiles:save",
});

export const deleteProfileCommand = createRuntimeCommand(appRuntime, {
    execute: Effect.fn("Profiles.deleteAndLeave")(function* deleteAndLeave(input: { from: Database; id: string }) {
        yield* settleLedger(input.from);
        // A deleted ledger never opens again: its cutoffs move to Personal so its late captures follow. Both the
        // marker and the active file change before the tombstone, so a crash cannot reopen a deleted ledger.
        yield* withRollback(
            Effect.gen(function* leaveLedger() {
                yield* Effect.try({ catch: switchFailed, try: () => retargetProfileSwitch(input.id, "personal") });
                yield* writeActive(undefined);
                yield* deleteProfile(input.id);
            })
        );
        // Past the tombstone a failed reload must not restore the deleted profile; the next launch opens Personal.
        yield* reload;
    }),
    label: "profiles:delete",
});
