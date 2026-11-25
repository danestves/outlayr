import { FunctionImpl, GroupImpl } from "@confect/server";
import { normalizeReferralCode } from "@outlayr/money/contract";
import { ConvexError } from "convex/values";
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

import type { MutationCtx as ConvexMutationCtx, QueryCtx as ConvexQueryCtx } from "../convex/_generated/server";
import databaseSchema from "./_generated/schema";
import { DatabaseReader, DatabaseWriter, MutationCtx, QueryCtx } from "./_generated/services";
import { optionalUserId, requireUserId } from "./lib/auth";
import { authComponent } from "./lib/betterAuth";
import { profileSharingEnabled } from "./lib/config";
import { dieAsConvexError } from "./lib/convexError";
import { activeMembers, currentLook, joinedProfiles, membership, sharingOwner } from "./lib/profileLedger";
import { refuseWhileDeleting } from "./lib/syncGuards";
import { inviteState, PROFILE_INVITE_TTL_MS, PROFILE_MEMBER_LIMIT, profileInviteLimiter } from "./profileSharing";
import spec from "./profileSharing.spec";
import type { ClaimStatus } from "./profileSharing.spec";
import { firstName, newCode } from "./referrals";
import { isPro, requirePro } from "./revenuecat";
import { syncOwner } from "./sync";

class NotProfileOwner extends Schema.TaggedError<NotProfileOwner>()("NotProfileOwner", {
    message: Schema.String.pipe(Schema.withConstructorDefault(Effect.succeed("Only the profile's owner can do this"))),
}) {}

type Refusal = Exclude<ClaimStatus, "joined" | "rateLimited">;

const refused = (status: Refusal) => ({ profileId: null, status });

const nullOnMissing = { GetByIndexFailure: () => Effect.succeed(null) };

const inviteByCode = Effect.fn("ProfileSharing.inviteByCode")(function* inviteByCode(code: string) {
    const reader = yield* DatabaseReader;
    return yield* reader.table("profileInvites").get("by_code", code).pipe(Effect.catchTags(nullOnMissing));
});

const refuseWhileSharingOff = Effect.gen(function* refuseWhileSharingOff() {
    if (!(yield* profileSharingEnabled)) {
        return yield* Effect.die(new ConvexError({ code: "PROFILE_SHARING_OFF" }));
    }
});

const nameOf = (ctx: ConvexQueryCtx | ConvexMutationCtx, userId: string) =>
    Effect.promise(() => authComponent.getAnyUserById(ctx, userId)).pipe(Effect.map((user) => firstName(user?.name)));

const enabled = FunctionImpl.make(
    databaseSchema,
    spec,
    "enabled",
    Effect.fn("ProfileSharing.enabled")(function* enabled() {
        return yield* profileSharingEnabled;
    }, Effect.orDie)
);

const createInvite = FunctionImpl.make(
    databaseSchema,
    spec,
    "createInvite",
    Effect.fn("ProfileSharing.createInvite")(
        function* createInvite(args) {
            const ctx = yield* MutationCtx;
            const reader = yield* DatabaseReader;
            const writer = yield* DatabaseWriter;
            const ownerId = yield* requireUserId(ctx);
            yield* refuseWhileSharingOff;
            const sharedBy = yield* sharingOwner(args.profileId);
            if (sharedBy !== null && sharedBy !== ownerId) {
                return yield* new NotProfileOwner();
            }
            yield* requirePro(ctx, ownerId);
            yield* refuseWhileDeleting(ownerId);
            if ((yield* currentLook(ownerId, args.profileId, args.look)) === null) {
                return yield* Effect.die(new ConvexError({ code: "PROFILE_DELETED" }));
            }
            if ((yield* activeMembers(args.profileId)).length >= PROFILE_MEMBER_LIMIT) {
                return yield* Effect.die(new ConvexError({ code: "PROFILE_FULL", limit: PROFILE_MEMBER_LIMIT }));
            }
            const now = yield* Clock.currentTimeMillis;
            const expiresAt = now + PROFILE_INVITE_TTL_MS;
            const open = yield* reader
                .table("profileInvites")
                .index("by_profileId_and_claimedAt", (q) => q.eq("profileId", args.profileId).eq("claimedAt", null))
                .collect();
            const expired = open.filter((row) => row.expiresAt <= now);
            yield* Effect.all(
                expired.map((row) => writer.table("profileInvites").delete(row._id)),
                { concurrency: "unbounded", discard: true }
            );
            const reusable = open.find((row) => row.ownerId === ownerId && row.expiresAt > now);
            if (reusable) {
                // A fresh window on every issue, so a sheet never hands out a code minutes from lapsing.
                yield* writer.table("profileInvites").patch(reusable._id, { expiresAt, look: args.look });
                return { code: reusable.code, expiresAt };
            }
            let code = newCode();
            while ((yield* inviteByCode(code)) !== null) {
                code = newCode();
            }
            yield* writer.table("profileInvites").insert({
                claimedAt: null,
                code,
                createdAt: now,
                expiresAt,
                look: args.look,
                ownerId,
                profileId: args.profileId,
            });
            return { code, expiresAt };
        },
        Effect.catchTags({
            AccountDeleting: dieAsConvexError,
            NotProfileOwner: dieAsConvexError,
            ProRequired: dieAsConvexError,
            Unauthenticated: dieAsConvexError,
        }),
        Effect.orDie
    )
);

const invite = FunctionImpl.make(
    databaseSchema,
    spec,
    "invite",
    Effect.fn("ProfileSharing.invite")(function* invite(args) {
        const ctx = yield* QueryCtx;
        if (!(yield* profileSharingEnabled)) {
            return null;
        }
        const code = normalizeReferralCode(args.code);
        if (code === null) {
            return null;
        }
        const row = yield* inviteByCode(code);
        if (row === null) {
            return null;
        }
        const viewerId = yield* optionalUserId(ctx);
        const [look, members, viewer, ownerName, now] = yield* Effect.all([
            currentLook(row.ownerId, row.profileId, row.look),
            activeMembers(row.profileId),
            viewerId === null ? Effect.succeed(null) : membership(row.profileId, viewerId),
            nameOf(ctx, row.ownerId),
            Clock.currentTimeMillis,
        ]);
        if (look === null) {
            return null;
        }
        const state = inviteState({
            invite: row,
            members: members.length,
            now,
            viewerId,
            viewerIsMember: viewer !== null && viewer.leftAt === null,
        });
        // A spent or lapsed code says only that, so a former member cannot keep reading a renamed profile.
        return state === "claimed" || state === "expired"
            ? { look: null, ownerName: null, state }
            : { look, ownerName, state };
    }, Effect.orDie)
);

const claim = FunctionImpl.make(
    databaseSchema,
    spec,
    "claim",
    Effect.fn("ProfileSharing.claim")(
        function* claim(args) {
            const ctx = yield* MutationCtx;
            const reader = yield* DatabaseReader;
            const writer = yield* DatabaseWriter;
            const memberId = yield* requireUserId(ctx);
            yield* refuseWhileSharingOff;
            const code = normalizeReferralCode(args.code);
            const row = code === null ? null : yield* inviteByCode(code);
            if (row === null) {
                const { ok } = yield* Effect.promise(() =>
                    profileInviteLimiter.limit(ctx, "profileInviteClaim", { key: memberId })
                );
                return ok ? refused("invalid") : { profileId: null, status: "rateLimited" as const };
            }
            const joined = { profileId: row.profileId, status: "joined" as const };
            const existing = yield* membership(row.profileId, memberId);
            if (existing !== null && existing.ownerId !== row.ownerId) {
                return refused("invalid");
            }
            const deleting = yield* Effect.all([refuseWhileDeleting(row.ownerId), refuseWhileDeleting(memberId)]).pipe(
                Effect.as(false),
                Effect.catchTags({ AccountDeleting: () => Effect.succeed(true) })
            );
            if (deleting) {
                return refused("invalid");
            }
            if (existing !== null && existing.leftAt === null) {
                return joined;
            }
            const now = yield* Clock.currentTimeMillis;
            // The claimant's own profile under this id, synced or only registered, would push into the owner's.
            const collides =
                existing === null &&
                row.ownerId !== memberId &&
                ((yield* reader
                    .table("syncState")
                    .get("by_user", syncOwner(memberId, row.profileId))
                    .pipe(Effect.as(true), Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(false) }))) ||
                    (yield* reader
                        .table("profiles")
                        .get("by_user_and_localId", memberId, row.profileId)
                        .pipe(Effect.as(true), Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(false) }))));
            const state = inviteState({
                invite: row,
                members: (yield* activeMembers(row.profileId)).length,
                now,
                viewerId: memberId,
                viewerIsMember: false,
            });
            if (collides || (yield* currentLook(row.ownerId, row.profileId, row.look)) === null) {
                return refused("invalid");
            }
            if (state !== "open") {
                return refused(state === "member" ? "invalid" : state);
            }
            if (!(yield* isPro(ctx, row.ownerId))) {
                return refused("ownerLapsed");
            }
            const { look } = row;
            yield* existing
                ? writer.table("profileMembers").patch(existing._id, { joinedAt: now, leftAt: null, look })
                : writer.table("profileMembers").insert({
                      joinedAt: now,
                      leftAt: null,
                      look,
                      memberId,
                      ownerId: row.ownerId,
                      profileId: row.profileId,
                  });
            yield* writer.table("profileInvites").patch(row._id, { claimedAt: now });
            return joined;
        },
        Effect.catchTags({ Unauthenticated: dieAsConvexError }),
        Effect.orDie
    )
);

const joined = FunctionImpl.make(
    databaseSchema,
    spec,
    "joined",
    Effect.fn("ProfileSharing.joined")(
        function* joined() {
            const ctx = yield* QueryCtx;
            // An empty list tells a device to delete its shared ledgers, so a dead session must not answer with one.
            const memberId = yield* requireUserId(ctx);
            const rows = yield* joinedProfiles(memberId);
            const profiles = yield* Effect.all(
                rows.map((row) =>
                    Effect.all([currentLook(row.ownerId, row.profileId, row.look), nameOf(ctx, row.ownerId)]).pipe(
                        Effect.map(([look, ownerName]) =>
                            look === null ? [] : [{ joinedAt: row.joinedAt, look, ownerName, profileId: row.profileId }]
                        )
                    )
                ),
                { concurrency: "unbounded" }
            );
            return profiles.flat();
        },
        Effect.catchTags({ Unauthenticated: dieAsConvexError }),
        Effect.orDie
    )
);

const members = FunctionImpl.make(
    databaseSchema,
    spec,
    "members",
    Effect.fn("ProfileSharing.members")(function* members(args) {
        const ctx = yield* QueryCtx;
        const reader = yield* DatabaseReader;
        const callerId = yield* optionalUserId(ctx);
        if (callerId === null) {
            return null;
        }
        const own = yield* membership(args.profileId, callerId);
        if (own !== null && own.leftAt !== null) {
            return null;
        }
        const ownerId = own?.ownerId ?? callerId;
        const [rows, now] = yield* Effect.all([activeMembers(args.profileId), Clock.currentTimeMillis]);
        const people = yield* Effect.all(
            [
                nameOf(ctx, ownerId).pipe(Effect.map((name) => ({ id: ownerId, joinedAt: null, name, owner: true }))),
                ...rows
                    .filter((row) => row.ownerId === ownerId)
                    .map((row) =>
                        nameOf(ctx, row.memberId).pipe(
                            Effect.map((name) => ({ id: row.memberId, joinedAt: row.joinedAt, name, owner: false }))
                        )
                    ),
            ],
            { concurrency: "unbounded" }
        );
        const openInvites =
            own === null
                ? yield* reader
                      .table("profileInvites")
                      .index("by_profileId_and_claimedAt", (q) =>
                          q.eq("profileId", args.profileId).eq("claimedAt", null)
                      )
                      .collect()
                : [];
        const live = openInvites.find((row) => row.ownerId === ownerId && row.expiresAt > now);
        return {
            invite: live ? { code: live.code, expiresAt: live.expiresAt } : null,
            members: people,
            role: own === null ? ("owner" as const) : ("member" as const),
        };
    }, Effect.orDie)
);

const removeMember = FunctionImpl.make(
    databaseSchema,
    spec,
    "removeMember",
    Effect.fn("ProfileSharing.removeMember")(
        function* removeMember(args) {
            const ctx = yield* MutationCtx;
            const ownerId = yield* requireUserId(ctx);
            const row = yield* membership(args.profileId, args.memberId);
            if (row === null || row.ownerId !== ownerId) {
                return yield* new NotProfileOwner();
            }
            if (row.leftAt === null) {
                yield* (yield* DatabaseWriter)
                    .table("profileMembers")
                    .patch(row._id, { leftAt: yield* Clock.currentTimeMillis });
            }
            return null;
        },
        Effect.catchTags({ NotProfileOwner: dieAsConvexError, Unauthenticated: dieAsConvexError }),
        Effect.orDie
    )
);

const leave = FunctionImpl.make(
    databaseSchema,
    spec,
    "leave",
    Effect.fn("ProfileSharing.leave")(
        function* leave(args) {
            const ctx = yield* MutationCtx;
            const memberId = yield* requireUserId(ctx);
            const row = yield* membership(args.profileId, memberId);
            if (row !== null && row.leftAt === null) {
                yield* (yield* DatabaseWriter)
                    .table("profileMembers")
                    .patch(row._id, { leftAt: yield* Clock.currentTimeMillis });
            }
            return null;
        },
        Effect.catchTags({ Unauthenticated: dieAsConvexError }),
        Effect.orDie
    )
);

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(enabled),
    Layer.provide(createInvite),
    Layer.provide(invite),
    Layer.provide(claim),
    Layer.provide(joined),
    Layer.provide(members),
    Layer.provide(removeMember),
    Layer.provide(leave),
    GroupImpl.finalize
);
