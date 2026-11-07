import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { isPeriodKey } from "../../../lib/dashboard-series-period";

const Param = Schema.UndefinedOr(Schema.String).pipe(
    Schema.catchDecoding(() => Effect.succeed(Option.some(undefined)))
);

const Search = Schema.Struct({
    accounts: Schema.optional(Param),
    category: Schema.optional(Param),
    period: Schema.optional(Param),
});

export const dashboardSearch = Schema.toStandardSchemaV1(Search);

export type DashboardSearch = typeof Search.Type;

export interface FilterPatch {
    accounts?: readonly string[];
    categories?: readonly string[];
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
    ...(patch.categories !== undefined && {
        category: patch.categories.length > 0 ? patch.categories.join(",") : undefined,
    }),
    ...(patch.period !== undefined && { period: patch.period ?? undefined }),
});

// An empty list means every account, so ticking a row narrows and unticking the last one widens back.
export const toggledAccounts = (chosen: readonly string[], id: string) =>
    chosen.includes(id) ? chosen.filter((each) => each !== id) : [...chosen, id];
