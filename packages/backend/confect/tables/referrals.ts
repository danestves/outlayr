import { Table } from "@confect/core";
import * as Schema from "effect/Schema";

export const ReferralStatus = Schema.Literals(["counting", "rewarded", "capped", "lifetime"]);

export default Table.make(() =>
    Schema.Struct({
        claimedAt: Schema.Number,
        daysLogged: Schema.Number,
        lastLoggedDay: Schema.NullOr(Schema.Number),
        referredId: Schema.String,
        referredName: Schema.NullOr(Schema.String),
        referrerId: Schema.String,
        rewardedAt: Schema.NullOr(Schema.Number),
        status: ReferralStatus,
    })
)
    .index("by_referredId", ["referredId"])
    .index("by_referrerId_and_claimedAt", ["referrerId", "claimedAt"])
    .index("by_referrerId_and_rewardedAt", ["referrerId", "rewardedAt"]);
