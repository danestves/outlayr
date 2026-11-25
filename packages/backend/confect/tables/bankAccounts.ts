import { Table } from "@confect/core";
import { BankAccountKind, BankAccountStatus, BankingProviderName } from "@outlayr/banking/provider";
import * as Schema from "effect/Schema";

// Link metadata only: transactions pass through `inboundWrites` to the phone and are never kept here.
export default Table.make(() =>
    Schema.Struct({
        accountId: Schema.String,
        cursor: Schema.optional(Schema.String),
        institution: Schema.String,
        kind: BankAccountKind,
        last4: Schema.NullOr(Schema.String),
        linkedAt: Schema.Number,
        name: Schema.String,
        provider: BankingProviderName,
        // The lease serializes pulls per account; `pullAgain` asks for one more run instead of interleaving two.
        pullAgain: Schema.optional(Schema.Boolean),
        pullLease: Schema.optional(Schema.Struct({ token: Schema.String, until: Schema.Number })),
        pulledAt: Schema.optional(Schema.Number),
        status: BankAccountStatus,
        userId: Schema.String,
    })
)
    .index("by_userId", ["userId"])
    .index("by_provider_and_accountId", ["provider", "accountId"]);
