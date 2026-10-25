import { Table } from "@confect/core";
import { MarketRateType } from "@outlayr/money/rates";
import * as Schema from "effect/Schema";

import { RateSource } from "../lib/currencies";

// Quoted per USD. `date` is UTC `YYYY-MM-DD` so a descending index seek finds the newest rate on or before a
// day, which covers the provider's weekend and holiday gaps.
export default Table.make(() =>
    Schema.Struct({
        date: Schema.String,
        fetchedAt: Schema.Number,
        quote: Schema.String,
        rate: Schema.Number,
        rateType: MarketRateType,
        source: RateSource,
    })
)
    .index("by_quote_and_rateType_and_date", ["quote", "rateType", "date"])
    .index("by_date", ["date"]);
