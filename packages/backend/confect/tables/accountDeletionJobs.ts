import { Table } from "@confect/core";
import * as Schema from "effect/Schema";

export default Table.make(() =>
    Schema.Struct({
        errorCode: Schema.NullOr(Schema.String),
        expiresAt: Schema.Number,
        googleReceiptChallengeHash: Schema.NullOr(Schema.String),
        googleReceiptDigest: Schema.NullOr(Schema.String),
        phase: Schema.Literals(["prepared", "providersRevoked", "purged", "billingErased", "authDeleting", "complete"]),
        provider: Schema.Union([
            Schema.Literal("appleServerRevoked"),
            Schema.Literal("credentialOnly"),
            Schema.Literal("googleLocalReceipt"),
            Schema.Null,
        ]),
        secretHash: Schema.String,
        tokenIdentifier: Schema.optional(Schema.String),
        userId: Schema.NullOr(Schema.String),
    })
)
    .index("by_secretHash", ["secretHash"])
    .index("by_phase_and_expiresAt", ["phase", "expiresAt"])
    .index("by_userId", ["userId"]);
