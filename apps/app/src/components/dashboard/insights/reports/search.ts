import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { shiftPeriodKey } from "../../../../lib/dashboard-series-period";
import { DIMENSIONS, GROUPINGS, MAX_ROLLING_MONTHS, MEASURES } from "./model";
import type { Definition, ReportRange } from "./model";

const Param = Schema.UndefinedOr(Schema.String).pipe(
    Schema.catchDecoding(() => Effect.succeed(Option.some(undefined)))
);

const Count = Schema.UndefinedOr(Schema.Number).pipe(
    Schema.catchDecoding(() => Effect.succeed(Option.some(undefined)))
);

const Search = Schema.Struct({
    cols: Schema.optional(Param),
    from: Schema.optional(Param),
    last: Schema.optional(Count),
    measure: Schema.optional(Param),
    report: Schema.optional(Param),
    rows: Schema.optional(Param),
    tags: Schema.optional(Param),
    to: Schema.optional(Param),
    view: Schema.optional(Param),
});

export const reportsSearch = Schema.toStandardSchemaV1(Search);

export type ReportsSearch = typeof Search.Type;
/** An undefined value drops the param from the address. */
export type ReportsPatch = Partial<ReportsSearch>;

const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;
const DEFAULT_MONTHS = 5;

const oneOf = <const Value extends string>(values: readonly Value[], value: string | undefined) =>
    values.find((each) => each === value);

export const idsOf = (value: string | undefined) => value?.split(",").filter((id) => id !== "") ?? [];

/** Any of these in the address means someone is building a report rather than arriving at the tab. */
export const isBuilding = (search: ReportsSearch) =>
    search.rows !== undefined ||
    search.cols !== undefined ||
    search.measure !== undefined ||
    search.from !== undefined ||
    search.last !== undefined ||
    search.tags !== undefined ||
    search.report !== undefined;

export interface DefinitionContext {
    accounts: readonly string[];
    currentKey: string;
    earliestKey: string;
    tagIds: ReadonlySet<string>;
}

function rangeOf(search: ReportsSearch, { currentKey, earliestKey }: DefinitionContext): ReportRange {
    const { from, last, to } = search;
    if (from !== undefined && to !== undefined && MONTH_KEY.test(from) && MONTH_KEY.test(to)) {
        return from <= to ? { from, to } : { from: to, to: from };
    }
    const months = Number(last);
    if (Number.isInteger(months) && months >= 1 && months <= MAX_ROLLING_MONTHS) {
        return { last: months };
    }
    const start = shiftPeriodKey(currentKey, -(DEFAULT_MONTHS - 1));
    return { from: start > earliestKey ? start : earliestKey, to: currentKey };
}

export function definitionOf(search: ReportsSearch, context: DefinitionContext): Definition {
    return {
        accounts: context.accounts,
        columns: oneOf(GROUPINGS, search.cols) ?? "month",
        measure: oneOf(MEASURES, search.measure) ?? "spending",
        range: rangeOf(search, context),
        rows: oneOf(DIMENSIONS, search.rows) ?? "category",
        tags: idsOf(search.tags).filter((id) => context.tagIds.has(id)),
    };
}

/** The address that carries a definition: every field is written, so what opens is what was saved. */
export function searchOf(definition: Definition): ReportsPatch {
    const { columns, measure, range, rows, tags } = definition;
    return {
        cols: columns,
        from: "from" in range ? range.from : undefined,
        last: "last" in range ? range.last : undefined,
        measure,
        rows,
        tags: tags.length > 0 ? tags.join(",") : undefined,
        to: "to" in range ? range.to : undefined,
    };
}
