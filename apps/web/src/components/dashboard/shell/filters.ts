import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as SchemaGetter from "effect/SchemaGetter";

import { isPeriodKey, periodKeyIn, periodKindOf } from "../../../lib/dashboard-series-period";
import type { Calendar } from "../../../lib/dashboard-series-period";

const Param = Schema.UndefinedOr(Schema.String).pipe(
    Schema.catchDecoding(() => Effect.succeed(Option.some(undefined)))
);

// The router reads a bare year in the address as a number.
const PeriodParam = Schema.UndefinedOr(Schema.Union([Schema.String, Schema.Number])).pipe(
    Schema.decodeTo(Schema.UndefinedOr(Schema.String), {
        decode: SchemaGetter.transform((value) => (value === undefined ? undefined : String(value))),
        encode: SchemaGetter.transform((value) => value),
    }),
    Schema.catchDecoding(() => Effect.succeed(Option.some(undefined)))
);

const Search = Schema.Struct({
    accounts: Schema.optional(Param),
    category: Schema.optional(Param),
    checkout: Schema.optional(Param),
    period: Schema.optional(PeriodParam),
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

/** Insights reads the same param as a week, a month or a year; a day inside a week snaps to that week. */
export function spanKeyOr(period: string | undefined, today: string, calendar: Calendar) {
    const kind = period === undefined ? null : periodKindOf(period);
    if (period === undefined || kind === null) {
        return periodKeyIn("month", today, calendar);
    }
    const current = periodKeyIn(kind, today, calendar);
    const key = kind === "week" ? periodKeyIn("week", period, calendar) : period;
    return key < current ? key : current;
}

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
