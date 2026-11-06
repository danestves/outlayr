import * as Schema from "effect/Schema";

import { isPeriodKey } from "../../../lib/dashboard-series-period";

const Search = Schema.Struct({
    accounts: Schema.optional(Schema.String),
    category: Schema.optional(Schema.String),
    period: Schema.optional(Schema.String),
});

export const dashboardSearch = Schema.toStandardSchemaV1(Search);

export type DashboardSearch = typeof Search.Type;

export interface FilterPatch {
    accounts?: readonly string[];
    category?: string | null;
    period?: string | null;
}

export const accountIdsOf = (accounts: string | undefined) => accounts?.split(",").filter((id) => id !== "") ?? [];

export const periodKeyOr = (period: string | undefined, currentKey: string) =>
    period !== undefined && isPeriodKey(period) && period < currentKey ? period : currentKey;

export const searchPatch = (patch: FilterPatch): DashboardSearch => ({
    ...(patch.accounts !== undefined && {
        accounts: patch.accounts.length > 0 ? patch.accounts.join(",") : undefined,
    }),
    ...(patch.category !== undefined && { category: patch.category ?? undefined }),
    ...(patch.period !== undefined && { period: patch.period ?? undefined }),
});
