import * as Effect from "effect/Effect";
import { reloadAsync } from "expo-updates";
import { DevSettings } from "react-native";

import { drainDevicePendingWrites } from "@/data/pending-writes";
import { deleteProfileLedger, profileLedgerExists } from "@/data/profile-ledger-files";
import { profileRegistry } from "@/data/profile-registry";
import { createProfile, deleteProfile, prepareProfileLedger } from "@/data/profiles";
import { ProfilesError, updateProfile } from "@/data/profiles-core";
import type { ProfileIdentity } from "@/data/profiles-core";
import { flushDeferredDeletes } from "@/data/use-deferred-delete";
import type { Database } from "@/db/client";
import { writeActiveProfile } from "@/lib/active-profile";
import { appRuntime } from "@/lib/runtime";
import { warnAndContinue } from "@/lib/warn-and-continue";

import { createRuntimeCommand } from "./atom-command";

const switchTo = Effect.fn("Profiles.switchTo")(function* switchTo(
    profileId: string | undefined,
    drainInto: Database | null
) {
    yield* flushDeferredDeletes;
    // A queued capture carries ids from the open ledger, so it lands there unless that ledger is being deleted.
    if (drainInto !== null) {
        yield* drainDevicePendingWrites(drainInto).pipe(
            warnAndContinue("[outlayr] pending writes not drained before switching profiles")
        );
    }
    yield* Effect.try({
        catch: (cause) => new ProfilesError({ cause, operation: "switch" }),
        try: () => writeActiveProfile(profileId),
    });
    if (__DEV__) {
        DevSettings.reload();
        return;
    }
    yield* Effect.tryPromise({
        catch: (cause) => new ProfilesError({ cause, operation: "switch" }),
        try: () => reloadAsync(),
    });
});

export const switchProfileCommand = createRuntimeCommand(appRuntime, {
    execute: Effect.fn("Profiles.switch")(function* switchProfile(input: {
        from: Database;
        profileId: string | undefined;
    }) {
        if (input.profileId !== undefined && !profileLedgerExists(input.profileId)) {
            // The marker only exists after a full seed, so anything else left on disk is a killed first switch.
            yield* deleteProfileLedger(input.profileId);
            yield* prepareProfileLedger(input.profileId, input.from, undefined);
        }
        yield* switchTo(input.profileId, input.from);
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
        yield* switchTo(yield* createProfile(input), input.from);
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
        yield* deleteProfile(id);
        yield* switchTo(undefined, null);
    }),
    label: "profiles:delete",
});
