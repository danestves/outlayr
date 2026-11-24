import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Schema from "effect/Schema";

import { SharedProfileLook } from "./lib/syncTables";
import { ProfileId } from "./sync";

export const InviteState = Schema.Literals(["claimed", "expired", "full", "member", "open", "own"]);

export const ClaimStatus = Schema.Literals([
    "claimed",
    "expired",
    "full",
    "invalid",
    "joined",
    "own",
    "ownerLapsed",
    "rateLimited",
]);

export type ClaimStatus = typeof ClaimStatus.Type;

const Member = Schema.Struct({
    id: Schema.String,
    joinedAt: Schema.NullOr(Schema.Number),
    name: Schema.NullOr(Schema.String),
    owner: Schema.Boolean,
});

export default GroupSpec.make()
    .addFunction(
        FunctionSpec.publicMutation({
            name: "createInvite",
            args: () => ({ look: SharedProfileLook, profileId: ProfileId }),
            returns: () => Schema.Struct({ code: Schema.String, expiresAt: Schema.Number }),
        })
    )
    .addFunction(
        FunctionSpec.publicQuery({
            name: "invite",
            args: () => ({ code: Schema.String }),
            returns: () =>
                Schema.NullOr(
                    Schema.Struct({
                        look: Schema.NullOr(SharedProfileLook),
                        ownerName: Schema.NullOr(Schema.String),
                        state: InviteState,
                    })
                ),
        })
    )
    .addFunction(
        FunctionSpec.publicMutation({
            name: "claim",
            args: () => ({ code: Schema.String }),
            returns: () => Schema.Struct({ profileId: Schema.NullOr(Schema.String), status: ClaimStatus }),
        })
    )
    .addFunction(
        FunctionSpec.publicQuery({
            name: "joined",
            args: () => ({}),
            returns: () =>
                Schema.Array(
                    Schema.Struct({
                        joinedAt: Schema.Number,
                        look: SharedProfileLook,
                        ownerName: Schema.NullOr(Schema.String),
                        profileId: Schema.String,
                    })
                ),
        })
    )
    .addFunction(
        FunctionSpec.publicQuery({
            name: "members",
            args: () => ({ profileId: ProfileId }),
            returns: () =>
                Schema.NullOr(
                    Schema.Struct({
                        invite: Schema.NullOr(Schema.Struct({ code: Schema.String, expiresAt: Schema.Number })),
                        members: Schema.Array(Member),
                        role: Schema.Literals(["owner", "member"]),
                    })
                ),
        })
    )
    .addFunction(
        FunctionSpec.publicMutation({
            name: "removeMember",
            args: () => ({ memberId: Schema.String, profileId: ProfileId }),
            returns: () => Schema.Null,
        })
    )
    .addFunction(
        FunctionSpec.publicMutation({
            name: "leave",
            args: () => ({ profileId: ProfileId }),
            returns: () => Schema.Null,
        })
    );
