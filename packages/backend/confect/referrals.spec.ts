import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Schema from "effect/Schema";

import { ReferralStatus } from "./tables/referrals";

const Refusal = ["invalid", "own", "used", "notNew", "hadPro"] as const;

export const ClaimStatus = Schema.Literals(["claimed", ...Refusal]);

export const RedeemStatus = Schema.Literals(["claimed", ...Refusal, "rateLimited", "signedOut", "unavailable"]);

export type RedeemStatus = typeof RedeemStatus.Type;

const Friend = Schema.Struct({
    claimedAt: Schema.Number,
    daysLogged: Schema.Number,
    id: Schema.String,
    name: Schema.NullOr(Schema.String),
    rewardedAt: Schema.NullOr(Schema.Number),
    status: ReferralStatus,
});

const Overview = Schema.Struct({
    bankedMonths: Schema.Number,
    canRedeem: Schema.Boolean,
    code: Schema.NullOr(Schema.String),
    earns: Schema.Boolean,
    friends: Schema.Array(Friend),
    promoEndsAt: Schema.NullOr(Schema.Number),
});

export type ReferralOverview = typeof Overview.Type;

export default GroupSpec.make()
    .addFunction(
        FunctionSpec.publicQuery({
            name: "inviter",
            args: () => ({ code: Schema.String }),
            returns: () => Schema.NullOr(Schema.Struct({ name: Schema.NullOr(Schema.String) })),
        })
    )
    .addFunction(FunctionSpec.publicMutation({ name: "ensureCode", args: () => ({}), returns: () => Schema.String }))
    .addFunction(
        FunctionSpec.publicQuery({ name: "overview", args: () => ({}), returns: () => Schema.NullOr(Overview) })
    )
    .addFunction(
        FunctionSpec.publicAction({
            name: "redeem",
            args: () => ({ code: Schema.String }),
            returns: () => RedeemStatus,
        })
    )
    .addFunction(
        FunctionSpec.internalMutation({
            name: "claim",
            args: () => ({ code: Schema.String, hadPro: Schema.Boolean, userId: Schema.String }),
            returns: () => ClaimStatus,
        })
    )
    .addFunction(
        FunctionSpec.internalQuery({
            name: "promoEnd",
            args: () => ({ userId: Schema.String }),
            returns: () => Schema.NullOr(Schema.Number),
        })
    )
    .addFunction(
        FunctionSpec.internalAction({
            name: "grant",
            args: () => ({ attempt: Schema.Number, userId: Schema.String }),
            returns: () => Schema.Null,
        })
    )
    .addFunction(
        FunctionSpec.internalAction({
            name: "releaseBanked",
            args: () => ({ userId: Schema.String }),
            returns: () => Schema.Null,
        })
    )
    .addFunction(
        FunctionSpec.internalMutation({
            name: "creditBanked",
            args: () => ({ userId: Schema.String }),
            returns: () => Schema.Null,
        })
    );
