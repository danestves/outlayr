import { wallMidnight } from "@outlayr/money/ledger-zone";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import type { TransactionSort } from "../home/rows";
import { ENTRY_TYPES, SPANS } from "./model";
import type { EntryType, LedgerQuery, Range, Span } from "./model";

const Param = Schema.UndefinedOr(Schema.String).pipe(
    Schema.catchDecoding(() => Effect.succeed(Option.some(undefined)))
);

const Search = Schema.Struct({
    entry: Schema.optional(Param),
    from: Schema.optional(Param),
    max: Schema.optional(Param),
    min: Schema.optional(Param),
    q: Schema.optional(Param),
    sort: Schema.optional(Param),
    span: Schema.optional(Param),
    to: Schema.optional(Param),
    type: Schema.optional(Param),
});

export const transactionsSearch = Schema.toStandardSchemaV1(Search);

export type PageSearch = typeof Search.Type;

// Accounts, categories and the month are the dashboard's own params, shared with home.
export type SearchPatch = { [Key in keyof PageSearch | "accounts" | "category" | "period"]?: string | null };

const DAY = /^\d{4}-\d{2}-\d{2}$/u;
const SORTS = ["oldest", "largest"] as const;

const oneOf = <const Value extends string>(values: readonly Value[], value: string | undefined) =>
    values.find((each) => each === value);

const amountOf = (value: string | undefined) => {
    const parsed = value === undefined || value === "" ? Number.NaN : Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

export interface PageQuery extends Omit<LedgerQuery, "accounts" | "categories" | "range"> {
    custom: Partial<Range>;
    span: Span | undefined;
    type: EntryType | undefined;
}

const realDay = (value: string) => {
    const time = wallMidnight(value);
    return !Number.isNaN(time) && new Date(time).toISOString().startsWith(value);
};

const dayOf = (value: string | undefined) =>
    value !== undefined && DAY.test(value) && realDay(value) ? value : undefined;

/** Reads the page's own search params, dropping anything malformed instead of failing the route. */
export function pageQueryOf(search: PageSearch): PageQuery {
    const from = dayOf(search.from);
    const to = dayOf(search.to);
    return {
        custom: { ...(from !== undefined && { from }), ...(to !== undefined && { to }) },
        max: amountOf(search.max),
        min: amountOf(search.min),
        q: search.q ?? "",
        sort: oneOf(SORTS, search.sort) ?? ("newest" satisfies TransactionSort),
        span: oneOf(SPANS, search.span),
        type: oneOf(ENTRY_TYPES, search.type),
    };
}

/** Patches the page's params; `null` or an empty string drops one from the URL. */
export const patched = <Search extends PageSearch>(search: Search, patch: SearchPatch) => ({
    ...search,
    ...Object.fromEntries(
        Object.entries(patch).map(([key, value]) => [key, value === null || value === "" ? undefined : value])
    ),
});
