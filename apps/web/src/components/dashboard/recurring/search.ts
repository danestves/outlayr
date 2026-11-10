import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

const Param = Schema.UndefinedOr(Schema.String).pipe(
    Schema.catchDecoding(() => Effect.succeed(Option.some(undefined)))
);

const Search = Schema.Struct({
    account: Schema.optional(Param),
    category: Schema.optional(Param),
    day: Schema.optional(Param),
    edit: Schema.optional(Param),
    item: Schema.optional(Param),
    month: Schema.optional(Param),
    q: Schema.optional(Param),
    repeats: Schema.optional(Param),
    sort: Schema.optional(Param),
    tab: Schema.optional(Param),
});

export const recurringSearch = Schema.toStandardSchemaV1(Search);

export type RecurringSearch = typeof Search.Type;

export type RecurringPatch = { [Key in keyof RecurringSearch]?: string | null };

export type SetRecurringSearch = (patch: RecurringPatch, options?: { replace?: boolean }) => void;

export const RECURRING_TABS = ["upcoming", "calendar", "all", "detected", "paused"] as const;

export type RecurringTab = (typeof RECURRING_TABS)[number];

export const tabOf = (search: RecurringSearch): RecurringTab =>
    RECURRING_TABS.find((tab) => tab === search.tab) ?? "upcoming";

export const ALL_SORTS = ["next", "amount", "name", "perMonth"] as const;

export type AllSort = (typeof ALL_SORTS)[number];

export const sortOf = (search: RecurringSearch): AllSort => ALL_SORTS.find((sort) => sort === search.sort) ?? "next";

export const NEW_SCHEDULE = "new";

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export const monthOf = (search: RecurringSearch, today: string) =>
    search.month !== undefined && MONTH.test(search.month) ? search.month : today.slice(0, 7);

export const dayOf = (search: RecurringSearch) =>
    search.day !== undefined && DAY.test(search.day) ? search.day : null;

export const patched = <Current extends RecurringSearch>(search: Current, patch: RecurringPatch) => ({
    ...search,
    ...Object.fromEntries(
        Object.entries(patch).map(([key, value]) => [key, value === null || value === "" ? undefined : value])
    ),
});
