import { Table } from "@confect/core";
import { BankingProviderName } from "@outlayr/banking/provider";
import * as Schema from "effect/Schema";

// The newest generation per provider: a run whose `seenAt` is older than this row writes nothing.
export default Table.make(() =>
    Schema.Struct({
        provider: BankingProviderName,
        seenAt: Schema.Number,
    })
).index("by_provider", ["provider"]);
