import { api } from "@outlayr/backend/convex/_generated/api";
import { and, eq, isNull } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { reopenDrains } from "@/data/pending-writes";
import { deleteProfileLedger, profileLedgerDeletionPending, profileLedgerExists } from "@/data/profile-ledger-files";
import { profileRegistry } from "@/data/profile-registry";
import { prepareProfileLedger } from "@/data/profiles";
import type { Database } from "@/db/client";
import { profiles } from "@/db/schema";
import { activeProfileId, retargetProfileSwitch } from "@/lib/active-profile";
import { cloudMutation, cloudQuery, isCloudAccount } from "@/lib/convex";
import { joinedProfilesCache, planJoinedReconcile, writeJoinedProfiles } from "@/lib/joined-profiles";
import type { JoinedProfilesCache, SharedProfileLook } from "@/lib/joined-profiles";
import { appRuntime } from "@/lib/runtime";
import { retireLedger } from "@/lib/widget-bridge";

import { createRuntimeCommand } from "./atom-command";
import { enter, reload, settleLedger, switchFailed, withRollback, writeActive } from "./profiles-commands";

const ProfileSharingOperation = Schema.Literals(["invite", "join", "leave", "reconcile"]);

export class ProfileSharingError extends Schema.TaggedError<ProfileSharingError>()("ProfileSharingError", {
    cause: Schema.Defect(),
    operation: ProfileSharingOperation,
}) {
    override get message(): string {
        return `Profile sharing ${this.operation} failed`;
    }
}

const failed = (operation: typeof ProfileSharingOperation.Type) => (cause: unknown) =>
    new ProfileSharingError({ cause, operation });

const writeCache = (operation: typeof ProfileSharingOperation.Type, cache: JoinedProfilesCache) =>
    Effect.try({ catch: failed(operation), try: () => writeJoinedProfiles(cache) });

const cacheAfterLeaving = (current: JoinedProfilesCache, id: string): JoinedProfilesCache => ({
    departed: current.departed.includes(id) ? current.departed : [...current.departed, id],
    joined: current.joined.filter((entry) => entry.profileId !== id),
});

const retireDeparted = Effect.fn("JoinedProfiles.retireDeparted")(function* retireDeparted(
    operation: typeof ProfileSharingOperation.Type,
    id: string
) {
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

const reconcile = Effect.fn("JoinedProfiles.reconcile")(function* reconcile() {
    // A signed-out query answers with no memberships, which would read as every shared ledger being revoked.
    if (!isCloudAccount()) {
        return;
    }
    const server = yield* cloudQuery(api.profileSharing.joined, {});
    const activeId = activeProfileId();
    const plan = planJoinedReconcile(joinedProfilesCache(), server, activeId);
    const droppedActiveId = plan.droppedActive ? activeId : undefined;
    yield* writeCache("reconcile", plan.cache);
    if (droppedActiveId !== undefined) {
        yield* Effect.try({
            catch: switchFailed,
            try: () => retargetProfileSwitch(droppedActiveId, "personal"),
        });
        yield* writeActive(undefined);
        // No settle: the server already refuses this ledger, and the reload lands on Personal.
        yield* reload;
    }
    for (const id of plan.cache.departed) {
        if (id !== droppedActiveId) {
            yield* retireDeparted("reconcile", id);
        }
    }
});

let reconciling = false;

export const reconcileJoinedProfiles = Effect.suspend(() => {
    if (reconciling) {
        return Effect.void;
    }
    reconciling = true;
    return reconcile().pipe(
        Effect.ensuring(
            Effect.sync(() => {
                reconciling = false;
            })
        )
    );
});

export const joinProfileCommand = createRuntimeCommand(appRuntime, {
    execute: Effect.fn("JoinedProfiles.join")(function* joinProfile(input: { code: string; from: Database }) {
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
            yield* prepareProfileLedger(profileId, input.from, undefined, { seedCategories: false });
        }
        yield* settleLedger(input.from);
        yield* withRollback(enter(profileId));
        return claim.status;
    }),
    label: "profiles:join",
});

export const leaveProfileCommand = createRuntimeCommand(appRuntime, {
    execute: Effect.fn("JoinedProfiles.leave")(function* leaveProfile(input: { from: Database; id: string }) {
        const active = activeProfileId() === input.id;
        if (active) {
            yield* settleLedger(input.from);
        }
        yield* Effect.gen(function* leave() {
            yield* cloudMutation(api.profileSharing.leave, { profileId: input.id });
            yield* writeCache("leave", cacheAfterLeaving(joinedProfilesCache(), input.id));
            if (!active) {
                yield* retireDeparted("leave", input.id);
                return;
            }
            yield* withRollback(
                Effect.gen(function* leaveLedger() {
                    yield* Effect.try({
                        catch: switchFailed,
                        try: () => retargetProfileSwitch(input.id, "personal"),
                    });
                    yield* writeActive(undefined);
                })
            );
        }).pipe(Effect.onError(() => (active ? Effect.sync(reopenDrains) : Effect.void)));
        if (active) {
            // Past the marker a failed reload must not restore the ledger the server already dropped.
            yield* reload;
        }
    }),
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
