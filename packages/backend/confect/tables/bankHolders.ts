import { Table } from "@confect/core";
import { BankingProviderName } from "@outlayr/banking/provider";
import * as Schema from "effect/Schema";

export default Table.make(() =>
    Schema.Struct({
        holder: Schema.String,
        provider: BankingProviderName,
        userId: Schema.String,
    })
).index("by_userId_and_provider", ["userId", "provider"]);
