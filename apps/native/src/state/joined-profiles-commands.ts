import { api } from "@outlayr/backend/convex/_generated/api";
import { and, eq, isNull } from "drizzle-orm";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as Semaphore from "effect/Semaphore";

import { reopenDrains } from "@/data/pending-writes";
import { pendingPhotoUploads, uploadPhotos } from "@/data/photo-sync-core";
import { deleteProfileLedger, profileLedgerDeletionPending, profileLedgerExists } from "@/data/profile-ledger-files";
import { profileRegistry } from "@/data/profile-registry";
import { prepareProfileLedger } from "@/data/profiles";
import { SyncStore } from "@/data/sync-store";
import type { Database } from "@/db/client";
import { profiles } from "@/db/schema";
import { activeProfileId, retargetProfileSwitch } from "@/lib/active-profile";
import { photoTransport } from "@/lib/cloud-photos";
import { cloudMutation, cloudQuery, isCloudAccount } from "@/lib/convex";
import {
    isJoinedProfile,
    joinedProfilesCache,
    joinedProfilesWrites,
    planJoinedReconcile,
    writeJoinedProfiles,
} from "@/lib/joined-profiles";
import type { JoinedProfilesCache, SharedProfileLook } from "@/lib/joined-profiles";
import { photoFiles } from "@/lib/photo-storage";
import { appRuntime } from "@/lib/runtime";
import { retireLedger } from "@/lib/widget-bridge";

import { createCommand, createRuntimeCommand } from "./atom-command";
import { enter, reload, settleLedger, switchFailed, withRollback, writeActive } from "./profiles-commands";

const ProfileSharingOperation = Schema.Literals(["invite", "join", "leave", "reconcile"]);

const ProfileSharingReason = Schema.Literals(["notActive", "unsynced"]);

export class ProfileSharingError extends Schema.TaggedError<ProfileSharingError>()("ProfileSharingError", {
    cause: Schema.Defect(),
    operation: ProfileSharingOperation,
    reason: Schema.optional(ProfileSharingReason),
}) {
    override get message(): string {
        return `Profile sharing ${this.operation} failed`;
    }
}

const failed = (operation: typeof ProfileSharingOperation.Type) => (cause: unknown) =>
    new ProfileSharingError({ cause, operation });

const writeCache = (operation: typeof ProfileSharingOperation.Type, cache: JoinedProfilesCache) =>
    Effect.try({ catch: failed(operation), try: () => writeJoinedProfiles(cache) });

// The live list moves mid-command on a join or leave, and a reconcile then could delete the ledger being entered.
const ledgerMoves = Semaphore.makeUnsafe(1);

const cacheAfterLeaving = (current: JoinedProfilesCache, id: string): JoinedProfilesCache => ({
    departed: current.departed.includes(id) ? current.departed : [...current.departed, id],
    joined: current.joined.filter((entry) => entry.profileId !== id),
});

const retireDeparted = Effect.fn("JoinedProfiles.retireDeparted")(function* retireDeparted(
    operation: typeof ProfileSharingOperation.Type,
    id: string
) {
    // The ledger this runtime has open cannot be deleted under it, so the next launch retires it.
    if (id === activeProfileId()) {
        return;
    }
    yield* Effect.sync(() => retireLedger(id));
    yield* deleteProfileLedger(id);
    if (profileLedgerDeletionPending(id)) {
        return;
    }
    const current = joinedProfilesCache();
    if (!current.departed.includes(id)) {
        return;
    }
    yield* writeCache(operation, {
        ...current,
        departed: current.departed.filter((departed) => departed !== id),
    });
});

export const reconcileJoinedProfiles = Effect.fn("JoinedProfiles.reconcile")(function* reconcile() {
    // Older backends answer a signed-out read with no memberships, which would read as every shared ledger revoked.
    if (!isCloudAccount()) {
        return;
    }
    const before = joinedProfilesWrites();
    const server = yield* cloudQuery(api.profileSharing.joined, {});
    // A join that wrote while this query was in flight would read as departed and lose its ledger.
    if (joinedProfilesWrites() !== before) {
        return;
    }
    const activeId = activeProfileId();
    const plan = planJoinedReconcile(joinedProfilesCache(), server, activeId);
    const droppedActiveId = plan.droppedActive ? activeId : undefined;
    // Leave the ledger before the cache names it departed, or a crash in between strands this device inside it.
    if (droppedActiveId !== undefined) {
        yield* Effect.try({
            catch: switchFailed,
            try: () => retargetProfileSwitch(droppedActiveId, "personal"),
        });
        yield* writeActive(undefined);
    }
    yield* writeCache("reconcile", plan.cache);
    if (droppedActiveId !== undefined) {
        // No settle: the server already refuses this ledger, and the reload lands on Personal.
        yield* reload;
    }
    for (const id of plan.cache.departed) {
        if (id !== droppedActiveId) {
            yield* retireDeparted("reconcile", id);
        }
    }
}, ledgerMoves.withPermits(1));

export const joinProfileCommand = createRuntimeCommand(appRuntime, {
    execute: Effect.fn("JoinedProfiles.join")(function* joinProfile(input: {
        accountId: string | null;
        code: string;
        from: Database;
    }) {
        const { accountId } = input;
        if (accountId === null) {
            return yield* new ProfileSharingError({
                cause: new Error("no account is signed in"),
                operation: "join",
            });
        }
        const claim = yield* cloudMutation(api.profileSharing.claim, { code: input.code });
        if (claim.status !== "joined") {
            return claim.status;
        }
        const { profileId } = claim;
        if (profileId === null) {
            return yield* new ProfileSharingError({
                cause: new Error("claim returned no profile"),
                operation: "join",
            });
        }
        const server = yield* cloudQuery(api.profileSharing.joined, {});
        const plan = planJoinedReconcile(joinedProfilesCache(), server, activeProfileId());
        yield* writeCache("join", plan.cache);
        if (!plan.cache.joined.some((entry) => entry.profileId === profileId)) {
            return yield* new ProfileSharingError({
                cause: new Error("joined profile missing from the server list"),
                operation: "join",
            });
        }
        if (!profileLedgerExists(profileId)) {
            yield* prepareProfileLedger(profileId, input.from, undefined, { replicaFor: accountId });
        }
        yield* settleLedger(input.from);
        yield* withRollback(enter(profileId));
        return claim.status;
    }, ledgerMoves.withPermits(1)),
    label: "profiles:join",
});

export const leaveProfileCommand = createRuntimeCommand(appRuntime, {
    execute: Effect.fn("JoinedProfiles.leave")(function* leaveProfile(input: { from: Database; id: string }) {
        if (activeProfileId() !== input.id || !isJoinedProfile(input.id)) {
            return yield* new ProfileSharingError({
                cause: new Error("only the active joined profile can leave"),
                operation: "leave",
                reason: "notActive",
            });
        }
        const store = yield* SyncStore;
        yield* settleLedger(input.from);
        yield* Effect.gen(function* flush() {
            // Rows sync but photos do not, and leaving revokes the membership the upload needs.
            const transport = yield* photoTransport();
            yield* uploadPhotos(input.from, photoFiles, transport, DateTime.toDate(yield* DateTime.now)).pipe(
                Effect.mapError(failed("leave"))
            );
            yield* store.sync(input.from).pipe(Effect.mapError(failed("leave")));
            const pending = yield* store.pending(input.from).pipe(Effect.mapError(failed("leave")));
            const photos = yield* pendingPhotoUploads(input.from).pipe(Effect.mapError(failed("leave")));
            if (pending > 0 || photos > 0) {
                return yield* new ProfileSharingError({
                    cause: new Error(`${pending} writes and ${photos} photos still pending`),
                    operation: "leave",
                    reason: "unsynced",
                });
            }
            yield* cloudMutation(api.profileSharing.leave, { profileId: input.id });
        }).pipe(Effect.onError(() => Effect.sync(reopenDrains)));
        yield* withRollback(
            Effect.gen(function* leaveLedger() {
                yield* Effect.try({
                    catch: switchFailed,
                    try: () => retargetProfileSwitch(input.id, "personal"),
                });
                yield* writeActive(undefined);
            })
        );
        yield* writeCache("leave", cacheAfterLeaving(joinedProfilesCache(), input.id));
        // Past the marker a failed reload must not restore the ledger the server already dropped.
        yield* reload;
    }, ledgerMoves.withPermits(1)),
    label: "profiles:leave",
});

const profileLook = Effect.fn("JoinedProfiles.profileLook")(function* profileLook(profileId: string) {
    const rows = yield* Effect.tryPromise({
        catch: failed("invite"),
        try: () =>
            profileRegistry()
                .select({
                    customColor: profiles.customColor,
                    emoji: profiles.emoji,
                    icon: profiles.icon,
                    imageColor: profiles.imageColor,
                    imageKey: profiles.imageKey,
                    name: profiles.name,
                })
                .from(profiles)
                .where(and(eq(profiles.id, profileId), isNull(profiles.deletedAt)))
                .limit(1),
    });
    const [row] = rows;
    if (row === undefined) {
        return yield* new ProfileSharingError({ cause: new Error("Profile not found"), operation: "invite" });
    }
    return row;
});

export const createProfileInvite = Effect.fn("JoinedProfiles.createInvite")(function* createProfileInvite(
    profileId: string
) {
    const look: SharedProfileLook = yield* profileLook(profileId);
    return yield* cloudMutation(api.profileSharing.createInvite, { look, profileId });
});

export const profileMembers = Effect.fn("JoinedProfiles.members")(function* profileMembers(profileId: string) {
    return yield* cloudQuery(api.profileSharing.members, { profileId });
});

export const removeProfileMember = Effect.fn("JoinedProfiles.removeMember")(function* removeProfileMember(
    profileId: string,
    memberId: string
) {
    yield* cloudMutation(api.profileSharing.removeMember, { memberId, profileId });
});

export const createProfileInviteCommand = createCommand({
    execute: ({ profileId }: { profileId: string }) => createProfileInvite(profileId),
    label: "profiles:create-invite",
});

export const removeProfileMemberCommand = createCommand({
    execute: ({ memberId, profileId }: { memberId: string; profileId: string }) =>
        removeProfileMember(profileId, memberId),
    label: "profiles:remove-member",
});
