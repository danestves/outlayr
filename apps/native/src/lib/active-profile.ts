import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { File, Paths } from "expo-file-system";

import { parseProfileId } from "@/domain/profiles";

import { clearClaimAssignments } from "./claim-assignments";
import { clearDurably, readDurably, writeDurably } from "./durable-file";
import { clearPurchaseRoutes } from "./purchase-routes";
import { queueLock } from "./queue-lock";

const activeProfileFile = () => new File(Paths.document, "active-profile");

const profileSwitchFile = () => new File(Paths.document, "profile-switch");

const ProfileSwitch = Schema.Struct({
    at: Schema.Finite,
    from: Schema.String,
    /** The native counter at the switch, absent on cutoffs written by older builds. */
    sequence: Schema.optional(Schema.Finite),
});

/** One cutoff: at `at` this launch left the ledger `from`, so older captures still belong to it. */
export type ProfileSwitch = typeof ProfileSwitch.Type;

const ProfileSwitches = Schema.Array(ProfileSwitch);

const decodeProfileSwitches = Schema.decodeUnknownOption(ProfileSwitches);

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

// Garbled or missing reads as no marker: a half-written list must not route a capture anywhere.
export function readProfileSwitch(): readonly ProfileSwitch[] {
    try {
        const text = readDurably(profileSwitchFile());
        return text === null ? [] : Option.getOrElse(decodeProfileSwitches(JSON.parse(text)), () => []);
    } catch {
        return [];
    }
}

export function writeProfileSwitch(switches: readonly ProfileSwitch[]): void {
    if (switches.length === 0) {
        clearProfileSwitch();
        return;
    }
    writeDurably(profileSwitchFile(), JSON.stringify(switches));
}

export function clearProfileSwitch(): void {
    clearDurably(profileSwitchFile());
}

// Call before `writeActiveProfile`: `activeProfileId()` still holds the launch profile, the one being left.
// Keeps expired cutoffs, which a queued capture can still need; only a drain that routed it prunes. A cutoff from
// the future with no counter means the clock moved back, so only those are dropped.
export function recordProfileSwitch(): void {
    const now = Date.now();
    const kept = readProfileSwitch().filter((entry) => entry.at <= now || entry.sequence !== undefined);
    const entry = { at: now, from: ledgerKey(activeProfileId()) };
    // A failed read throws so the switch rolls back: a cutoff with no counter reads every queued stamped capture as
    // after the switch, filing the old ledger's captures in the new one.
    const sequence = queueLock?.queueSequence() ?? null;
    writeProfileSwitch([...kept, sequence === null ? entry : { ...entry, sequence }]);
}

// A deleted ledger never opens again: its cutoffs move to `to` so its late captures follow, and no held file for it
// is ever written.
export function retargetProfileSwitch(from: string, to: string): void {
    const switches = readProfileSwitch();
    if (switches.some((entry) => entry.from === from)) {
        writeProfileSwitch(switches.map((entry) => (entry.from === from ? { ...entry, from: to } : entry)));
    }
}

export function resetActiveProfile(): void {
    writeActiveProfile(undefined);
    clearProfileSwitch();
    clearPurchaseRoutes();
    clearClaimAssignments();
    active = { id: undefined };
}
