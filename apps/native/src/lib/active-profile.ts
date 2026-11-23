import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { File, Paths } from "expo-file-system";

import { parseProfileId } from "@/domain/profiles";

const activeProfileFile = () => new File(Paths.document, "active-profile");

const profileSwitchFile = () => new File(Paths.document, "profile-switch");

const ProfileSwitch = Schema.Struct({
    at: Schema.Finite,
    from: Schema.String,
});

/** The ledger a switch left: its captured writes must reach `from`, not whichever ledger opens next. */
export type ProfileSwitch = typeof ProfileSwitch.Type;

const decodeProfileSwitch = Schema.decodeUnknownOption(ProfileSwitch);

let active: { id: string | undefined } | null = null;

/** Personal has no id, so it needs a name the queue can put in a file name. */
export function ledgerKey(profileId: string | undefined): string {
    return profileId ?? "personal";
}

export function activeProfileId(): string | undefined {
    if (active === null) {
        const file = activeProfileFile();
        active = { id: file.exists ? parseProfileId(file.textSync()) : undefined };
    }
    return active.id;
}

export function writeActiveProfile(profileId: string | undefined): void {
    const file = activeProfileFile();
    if (profileId === undefined) {
        if (file.exists) {
            file.delete();
        }
    } else {
        file.writeSync(profileId);
    }
}

export function readProfileSwitch(): ProfileSwitch | null {
    try {
        const file = profileSwitchFile();
        return file.exists ? Option.getOrNull(decodeProfileSwitch(JSON.parse(file.textSync()))) : null;
    } catch {
        return null;
    }
}

export function clearProfileSwitch(): void {
    const file = profileSwitchFile();
    if (file.exists) {
        file.delete();
    }
}

export function restoreProfileSwitch(previous: ProfileSwitch | null): void {
    if (previous === null) {
        clearProfileSwitch();
    } else {
        profileSwitchFile().writeSync(JSON.stringify(previous));
    }
}

// Call before `writeActiveProfile`: `activeProfileId()` still holds the launch profile, the one being left.
export function recordProfileSwitch(): void {
    profileSwitchFile().writeSync(JSON.stringify({ at: Date.now(), from: ledgerKey(activeProfileId()) }));
}

export function resetActiveProfile(): void {
    writeActiveProfile(undefined);
    clearProfileSwitch();
    active = { id: undefined };
}
