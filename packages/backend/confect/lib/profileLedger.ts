import { ConvexError } from "convex/values";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { DatabaseReader, DatabaseWriter } from "../_generated/services";
import { syncOwner } from "../sync";
import { IMAGE_KEY_TABLES } from "./syncTables";
import type { SharedProfileLook } from "./syncTables";

export class NotProfileMember extends Schema.TaggedError<NotProfileMember>()("NotProfileMember", {
    message: Schema.String.pipe(
        Schema.withConstructorDefault(Effect.succeed("You are no longer a member of this profile"))
    ),
}) {}

// A code, not the message, so a device can tell this apart and drop its copy of the ledger.
export const dieNotProfileMember = () => Effect.die(new ConvexError({ code: "NOT_PROFILE_MEMBER" }));

const nullOnMissing = { GetByIndexFailure: () => Effect.succeed(null) };

export const membership = Effect.fn("ProfileLedger.membership")(function* membership(
    profileId: string,
    memberId: string
) {
    const reader = yield* DatabaseReader;
    return yield* reader
        .table("profileMembers")
        .get("by_profileId_and_memberId", profileId, memberId)
        .pipe(Effect.catchTags(nullOnMissing));
});

// No membership means the caller's own profile: its registry row may not have synced yet, so absence is not refusal.
export const resolveLedger = Effect.fn("ProfileLedger.resolve")(function* resolveLedger(
    accountId: string,
    profileId: string | undefined
) {
    if (profileId === undefined) {
        return { joined: false, key: accountId, ownerId: accountId };
    }
    const row = yield* membership(profileId, accountId);
    if (row === null) {
        return { joined: false, key: syncOwner(accountId, profileId), ownerId: accountId };
    }
    if (row.leftAt !== null) {
        return yield* new NotProfileMember();
    }
    return { joined: true, key: syncOwner(row.ownerId, profileId), ownerId: row.ownerId };
});

// The owner's registry row wins once it has synced; until then the look the owner sent with the invite stands in.
export const currentLook = Effect.fn("ProfileLedger.currentLook")(function* currentLook(
    ownerId: string,
    profileId: string,
    fallback: typeof SharedProfileLook.Type
) {
    const reader = yield* DatabaseReader;
    const row = yield* reader
        .table("profiles")
        .get("by_user_and_localId", ownerId, profileId)
        .pipe(Effect.catchTags(nullOnMissing));
    if (row === null) {
        return fallback;
    }
    if (row.deletedAt !== null) {
        return null;
    }
    return {
        customColor: row.customColor,
        emoji: row.emoji,
        icon: row.icon,
        imageColor: row.imageColor,
        imageKey: row.imageKey,
        name: row.name,
    };
});

export const activeMembers = Effect.fn("ProfileLedger.activeMembers")(function* activeMembers(profileId: string) {
    const reader = yield* DatabaseReader;
    return yield* reader
        .table("profileMembers")
        .index("by_profileId_and_leftAt", (q) => q.eq("profileId", profileId).eq("leftAt", null))
        .collect();
});

// Profile ids are chosen by devices, so the first account to share one keeps it: another account reusing the id
// could otherwise hand out invites into a ledger it does not own.
export const sharingOwner = Effect.fn("ProfileLedger.sharingOwner")(function* sharingOwner(profileId: string) {
    const reader = yield* DatabaseReader;
    const [member, invite] = yield* Effect.all([
        reader
            .table("profileMembers")
            .index("by_profileId_and_leftAt", (q) => q.eq("profileId", profileId))
            .first(),
        reader
            .table("profileInvites")
            .index("by_profileId_and_claimedAt", (q) => q.eq("profileId", profileId))
            .first(),
    ]);
    if (Option.isSome(member)) {
        return member.value.ownerId;
    }
    return Option.isSome(invite) ? invite.value.ownerId : null;
});

export const joinedProfiles = Effect.fn("ProfileLedger.joinedProfiles")(function* joinedProfiles(memberId: string) {
    const reader = yield* DatabaseReader;
    return yield* reader
        .table("profileMembers")
        .index("by_memberId_and_leftAt", (q) => q.eq("memberId", memberId).eq("leftAt", null))
        .collect();
});

// Tombstoned rows count: undo restores from them and a device that has not pulled yet still renders them.
export const isReferenced = Effect.fn("ProfileLedger.isReferenced")(function* isReferenced(
    userId: string,
    key: string
) {
    const reader = yield* DatabaseReader;
    // The first table that names the key answers the question; running them all would read rows nobody needs.
    for (const table of IMAGE_KEY_TABLES) {
        const row = yield* reader
            .table(table)
            .index("by_user_and_imageKey", (q) => q.eq("userId", userId).eq("imageKey", key))
            .first();
        if (Option.isSome(row)) {
            return true;
        }
    }
    return false;
});

// The ledgers the caller shares with someone, with everyone who ever belonged to each: the ones they joined, and
// their own ones that ever had members, whose entries keep a departed member's photos.
export const sharedLedgers = Effect.fn("ProfileLedger.sharedLedgers")(function* sharedLedgers(accountId: string) {
    const reader = yield* DatabaseReader;
    const [joined, owned] = yield* Effect.all([
        joinedProfiles(accountId),
        reader
            .table("profileMembers")
            .index("by_ownerId_and_leftAt", (q) => q.eq("ownerId", accountId))
            .collect(),
    ]);
    const profiles = new Map([...joined, ...owned].map((row) => [syncOwner(row.ownerId, row.profileId), row] as const));
    const ledgers = yield* Effect.all(
        [...profiles].map(([key, { ownerId, profileId }]) =>
            reader
                .table("profileMembers")
                .index("by_profileId_and_leftAt", (q) => q.eq("profileId", profileId))
                .collect()
                .pipe(
                    Effect.map((rows) => ({
                        key,
                        parties: new Set([
                            ownerId,
                            ...rows.filter((row) => row.ownerId === ownerId).map((row) => row.memberId),
                        ]),
                    }))
                )
        ),
        { concurrency: "unbounded" }
    );
    return { joined, ledgers };
});

export const endSharing = Effect.fn("ProfileLedger.endSharing")(function* endSharing(
    ownerId: string,
    profileId: string,
    now: number
) {
    const reader = yield* DatabaseReader;
    const writer = yield* DatabaseWriter;
    const [members, invites] = yield* Effect.all([
        activeMembers(profileId),
        reader
            .table("profileInvites")
            .index("by_profileId_and_claimedAt", (q) => q.eq("profileId", profileId).eq("claimedAt", null))
            .collect(),
    ]);
    yield* Effect.all(
        [
            ...members
                .filter((row) => row.ownerId === ownerId)
                .map((row) => writer.table("profileMembers").patch(row._id, { leftAt: now })),
            ...invites
                .filter((row) => row.ownerId === ownerId)
                .map((row) => writer.table("profileInvites").delete(row._id)),
        ],
        { concurrency: "unbounded", discard: true }
    );
});
