import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { BASES, DIMENSIONS, METRICS } from "./model";
import type { Basis, Dimension, Metric } from "./model";

const Param = Schema.UndefinedOr(Schema.String).pipe(
    Schema.catchDecoding(() => Effect.succeed(Option.some(undefined)))
);

const Search = Schema.Struct({
    by: Schema.optional(Param),
    compare: Schema.optional(Param),
    show: Schema.optional(Param),
    tag: Schema.optional(Param),
});

export const breakdownSearch = Schema.toStandardSchemaV1(Search);

export type BreakdownSearch = typeof Search.Type;

const oneOf = <const Value extends string>(values: readonly Value[], value: string | undefined) =>
    values.find((each) => each === value);

export interface BreakdownView {
    /** Set only while the comparison view is on. */
    compare: Basis | null;
    dimension: Dimension;
    metric: Metric;
    tag: string | null;
}

/** The page's own params as the model reads them, anything malformed falling back to the default. */
export const viewOf = (search: BreakdownSearch): BreakdownView => ({
    compare: oneOf(BASES, search.compare) ?? null,
    dimension: oneOf(DIMENSIONS, search.by) ?? "category",
    metric: oneOf(METRICS, search.show) ?? "spent",
    tag: search.tag ?? null,
});

export type ViewPatch = { [Key in keyof BreakdownSearch]?: string | null };

export const patched = (prev: BreakdownSearch, patch: ViewPatch): BreakdownSearch => {
    const next = { ...prev };
    for (const [key, value] of Object.entries(patch)) {
        if (key === "by" || key === "compare" || key === "show" || key === "tag") {
            next[key] = value ?? undefined;
        }
    }
    return next;
};
