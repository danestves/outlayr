import * as Effect from "effect/Effect";
import { reloadAsync } from "expo-updates";
import { DevSettings } from "react-native";

import { profileRegistry } from "@/data/profile-registry";
import { createProfile, deleteProfile } from "@/data/profiles";
import { ProfilesError, updateProfile } from "@/data/profiles-core";
import type { ProfileIdentity } from "@/data/profiles-core";
import { flushDeferredDeletes } from "@/data/use-deferred-delete";
import type { Database } from "@/db/client";
import { writeActiveProfile } from "@/lib/active-profile";
import { appRuntime } from "@/lib/runtime";

import { createRuntimeCommand } from "./atom-command";

const switchTo = Effect.fn("Profiles.switchTo")(function* switchTo(profileId: string | undefined) {
    yield* flushDeferredDeletes;
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
    execute: (profileId: string | undefined) => switchTo(profileId),
    label: "profiles:switch",
});

export const createProfileCommand = createRuntimeCommand(appRuntime, {
    execute: Effect.fn("Profiles.createAndSwitch")(function* createAndSwitch(input: {
        currency: string;
        from: Database;
        identity: ProfileIdentity;
        name: string;
    }) {
        yield* switchTo(yield* createProfile(input));
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
        yield* switchTo(undefined);
    }),
    label: "profiles:delete",
});
