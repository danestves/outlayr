import { Table } from "@confect/core";
import { BankingProviderName } from "@outlayr/banking/provider";
import * as Schema from "effect/Schema";

// Rows are never deleted: a linked account or an open search result may still point at a retired one.
export default Table.make(() =>
    Schema.Struct({
        catchAll: Schema.Boolean,
        country: Schema.String,
        externalId: Schema.String,
        logo: Schema.NullOr(Schema.String),
        name: Schema.String,
        popularity: Schema.Number,
        provider: BankingProviderName,
        retired: Schema.Boolean,
        // The newest sync run that saw the row; a run never writes over a row a newer run stamped.
        seenAt: Schema.Number,
    })
)
    .index("by_provider_and_externalId_and_country", ["provider", "externalId", "country"])
    .index("by_provider_and_retired_and_seenAt", ["provider", "retired", "seenAt"])
    .index("by_retired_and_catchAll", ["retired", "catchAll"])
    .index("by_retired_and_country_and_popularity", ["retired", "country", "popularity"])
    .searchIndex("search_name", { filterFields: ["retired", "country", "catchAll"], searchField: "name" });
