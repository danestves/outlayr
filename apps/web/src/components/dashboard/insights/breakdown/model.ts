import { merchantKey } from "@outlayr/money/merchant-key";

import { UNCATEGORIZED_ID, round, rowsBetween, total } from "../../../../lib/dashboard-series-ledger";
import type { Ledger, LedgerRow, Scope } from "../../../../lib/dashboard-series-ledger";
import { daysFrom, periodOf, shiftPeriodKey } from "../../../../lib/dashboard-series-period";
import type { Period } from "../../../../lib/dashboard-series-period";
import { addDays, daysBetween } from "../../../../lib/ledger";
import type { TagBooks } from "../reports/model";

export const DIMENSIONS = ["category", "subcategory", "merchant", "tag"] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export const METRICS = ["spent", "income", "net"] as const;
export type Metric = (typeof METRICS)[number];

export const BASES = ["prior", "year", "average"] as const;
export type Basis = (typeof BASES)[number];

const AVERAGED_SPANS = 3;
const WEEKS_IN_YEAR = 52;
const MONTHS_IN_YEAR = 12;
const CAP_HEADROOM = 1.1;
const CAP_STEP = 20;
const OUTLIER_RATIO = 2;

export interface Group {
    amount: number;
    /** The top category the group sits in, or the one a merchant spends most in. */
    categoryId: string;
    color: string;
    count: number;
    id: string;
    name: string;
    /** The category's name beside a subcategory. */
    parent: string | null;
}

export interface Flow {
    row: LedgerRow;
    value: number;
}

const signed = (metric: Metric, row: LedgerRow) => (metric === "net" && !row.income ? -row.amount : row.amount);

/** The rows a metric reads, from `from` through `to`: spending, income, or both with spending negative. */
export function flowsOf(
    ledger: Ledger,
    scope: Scope,
    metric: Metric,
    from: string,
    to: string,
    category: string | null
): Flow[] {
    const kinds = metric === "net" ? [false, true] : [metric === "income"];
    return kinds
        .flatMap((income) => rowsBetween(ledger, scope, from, to, income))
        .filter((row) => category === null || row.topId === category)
        .map((row) => ({ row, value: signed(metric, row) }));
}

const sum = (ledger: Ledger, flows: readonly Flow[]) =>
    total(
        ledger,
        flows.map(({ value }) => ({ amount: value }))
    );

const categoryOf = (ledger: Ledger, id: string) => ledger.categories.get(id) ?? ledger.categories.get(UNCATEGORIZED_ID);

function categoryNames(ledger: Ledger) {
    return new Map(ledger.books.categories.map((row) => [row.localId, row.name]));
}

interface Keyed {
    categoryId: string;
    key: string;
    name: string;
    parent: string | null;
}

type KeyOf = (row: LedgerRow) => Keyed;

function keyerFor(ledger: Ledger, dimension: Exclude<Dimension, "tag">): KeyOf {
    const names = categoryNames(ledger);
    return (row) => {
        const top = categoryOf(ledger, row.topId);
        if (dimension === "category") {
            return { categoryId: row.topId, key: row.topId, name: top?.name ?? "", parent: null };
        }
        if (dimension === "subcategory") {
            const own = row.categoryId === null ? undefined : names.get(row.categoryId);
            return {
                categoryId: row.topId,
                key: row.categoryId ?? UNCATEGORIZED_ID,
                name: own ?? top?.name ?? "",
                parent: row.parentId === null ? null : (top?.name ?? null),
            };
        }
        const merchant = merchantKey(row.note);
        return {
            categoryId: row.topId,
            key: merchant === "" ? `${UNCATEGORIZED_ID}:${row.topId}` : merchant,
            name: row.note.trim() || top?.name || "",
            parent: null,
        };
    };
}

/** Flows folded into groups, the largest first. A merchant takes the colour of the category it spends most in. */
export function groupFlows(ledger: Ledger, flows: readonly Flow[], keyOf: KeyOf): Group[] {
    const byKey = Map.groupBy(flows, ({ row }) => keyOf(row).key);
    return [...byKey.values()]
        .map((members): Group => {
            const [first] = members;
            const head = first ? keyOf(first.row) : undefined;
            const byCategory = new Map<string, number>();
            for (const { row, value } of members) {
                byCategory.set(row.topId, (byCategory.get(row.topId) ?? 0) + Math.abs(value));
            }
            const lead =
                [...byCategory].toSorted((a, b) => b[1] - a[1])[0]?.[0] ?? head?.categoryId ?? UNCATEGORIZED_ID;
            const category = categoryOf(ledger, lead);
            return {
                amount: sum(ledger, members),
                categoryId: lead,
                color: category?.color ?? "",
                count: members.length,
                id: head?.key ?? "",
                name: head?.name ?? "",
                parent: head?.parent ?? null,
            };
        })
        .toSorted((a, b) => Math.abs(b.amount) - Math.abs(a.amount) || a.name.localeCompare(b.name));
}

export interface TagGroup extends Group {
    sortOrder: number;
}

const TINT_RAMP = [100, 62, 34];
const TINT_FLOOR = 20;

/** A tag's own colour, or the app tint stepped down by rank. */
export const tagColor = (color: string | null, rank: number) =>
    color ??
    `color-mix(in oklab, var(--color-app-tint) ${Math.max(TINT_RAMP[rank] ?? TINT_FLOOR, TINT_FLOOR)}%, var(--color-muted))`;

export interface TagSplit {
    byTag: Map<string, Flow[]>;
    /** Rows with no tag. */
    untagged: Flow[];
    groups: TagGroup[];
    tagged: Flow[];
}

/** Flows split by tag. An entry with two tags is in both groups and counted once as tagged. */
export function splitByTag(ledger: Ledger, flows: readonly Flow[], { links, tags }: TagBooks): TagSplit {
    const live = new Set(tags.filter((tag) => tag.deletedAt === null).map((tag) => tag.localId));
    const tagsOf = new Map<string, string[]>();
    for (const { deletedAt, tagId, transactionId } of links) {
        if (deletedAt !== null || !live.has(tagId)) {
            continue;
        }
        const same = tagsOf.get(transactionId);
        if (same) {
            same.push(tagId);
        } else {
            tagsOf.set(transactionId, [tagId]);
        }
    }
    const byTag = new Map<string, Flow[]>();
    const tagged: Flow[] = [];
    const untagged: Flow[] = [];
    for (const flow of flows) {
        const own = tagsOf.get(flow.row.id) ?? [];
        if (own.length === 0) {
            untagged.push(flow);
            continue;
        }
        tagged.push(flow);
        for (const id of new Set(own)) {
            byTag.set(id, [...(byTag.get(id) ?? []), flow]);
        }
    }
    const groups = tags
        .flatMap((tag): TagGroup[] => {
            const members = byTag.get(tag.localId);
            if (!members) {
                return [];
            }
            return [
                {
                    amount: sum(ledger, members),
                    categoryId: UNCATEGORIZED_ID,
                    color: "",
                    count: members.length,
                    id: tag.localId,
                    name: tag.name,
                    parent: null,
                    sortOrder: tag.sortOrder,
                },
            ];
        })
        .toSorted((a, b) => Math.abs(b.amount) - Math.abs(a.amount) || a.sortOrder - b.sortOrder);
    return {
        byTag,
        groups: groups.map((group, rank) => ({
            ...group,
            color: tagColor(tags.find((tag) => tag.localId === group.id)?.color ?? null, rank),
        })),
        tagged,
        untagged,
    };
}

export interface Window {
    from: string;
    to: string;
}

export interface Baseline {
    /** The span the figures are named for, when there is one; an average has none. */
    named: Period | null;
    windows: Window[];
}

const firstDayOf = (ledger: Ledger) =>
    ledger.rows.reduce((first, row) => (row.day < first ? row.day : first), ledger.today);

/** The span, cut to the days an open span has run, so a half month is not set against a whole one. */
function cutLike(span: Period, today: string, prior: Period): Window {
    const elapsed = daysBetween(span.from, today) + 1;
    if (elapsed >= span.days) {
        return { from: prior.from, to: prior.to };
    }
    const to = addDays(prior.from, Math.max(elapsed, 1) - 1);
    return { from: prior.from, to: to < prior.to ? to : prior.to };
}

function sameLastYear(span: Period, kind: "month" | "week" | "year") {
    if (kind === "week") {
        return shiftPeriodKey(span.key, -WEEKS_IN_YEAR);
    }
    return kind === "month" ? shiftPeriodKey(span.key, -MONTHS_IN_YEAR) : shiftPeriodKey(span.key, -1);
}

/** What a span is compared with, or null when that history does not exist. */
export function baselineOf(
    ledger: Ledger,
    span: Period,
    kind: "month" | "week" | "year",
    basis: Basis
): Baseline | null {
    const first = firstDayOf(ledger);
    const spanAt = (key: string) => periodOf(key, ledger.firstDayOfMonth);
    if (basis === "average") {
        const spans = Array.from({ length: AVERAGED_SPANS }, (_, index) =>
            spanAt(shiftPeriodKey(span.key, -(index + 1)))
        );
        if (spans.some((each) => each.from < first)) {
            return null;
        }
        return { named: null, windows: spans.map((each) => cutLike(span, ledger.today, each)) };
    }
    const named = spanAt(basis === "prior" ? shiftPeriodKey(span.key, -1) : sameLastYear(span, kind));
    if (named.to < first) {
        return null;
    }
    return { named, windows: [cutLike(span, ledger.today, named)] };
}

export function baseAmounts(
    ledger: Ledger,
    scope: Scope,
    metric: Metric,
    category: string | null,
    baseline: Baseline,
    keyOf: KeyOf
) {
    const count = baseline.windows.length;
    const pooled = baseline.windows.flatMap(({ from, to }) => flowsOf(ledger, scope, metric, from, to, category));
    const amounts = new Map<string, number>();
    for (const group of groupFlows(ledger, pooled, keyOf)) {
        amounts.set(group.id, round(ledger, group.amount / count));
    }
    return { amounts, flows: pooled, total: round(ledger, sum(ledger, pooled) / count) };
}

export interface BreakdownRow extends Group {
    base: number;
    delta: number;
    /** Change over the base as a fraction, or null when the base was nothing. */
    percent: number | null;
}

export interface Breakdown {
    baseTotal: number | null;
    count: number;
    flows: readonly Flow[];
    keyOf: KeyOf;
    rows: BreakdownRow[];
    total: number;
}

const withBase = (ledger: Ledger, group: Group, base: number): BreakdownRow => ({
    ...group,
    base,
    delta: round(ledger, group.amount - base),
    percent: base === 0 ? null : (group.amount - base) / Math.abs(base),
});

export interface BreakdownQuery {
    basis: Basis;
    category: string | null;
    dimension: Exclude<Dimension, "tag">;
    kind: "month" | "week" | "year";
    metric: Metric;
}

export function breakdownOf(ledger: Ledger, scope: Scope, span: Period, query: BreakdownQuery): Breakdown {
    const { basis, category, dimension, kind, metric } = query;
    const last = ledger.today < span.to ? ledger.today : span.to;
    const flows = flowsOf(ledger, scope, metric, span.from, last, category);
    const keyOf = keyerFor(ledger, dimension);
    const groups = groupFlows(ledger, flows, keyOf);
    const baseline = baselineOf(ledger, span, kind, basis);
    const base = baseline ? baseAmounts(ledger, scope, metric, category, baseline, keyOf) : null;
    const seen = new Set(groups.map((group) => group.id));
    const gone = base
        ? groupFlows(ledger, base.flows, keyOf)
              .filter((group) => !seen.has(group.id))
              .map((group) => ({ ...group, amount: 0, count: 0 }))
        : [];
    const rows = [...groups, ...gone].map((group) => withBase(ledger, group, base?.amounts.get(group.id) ?? 0));
    return {
        baseTotal: base ? base.total : null,
        count: flows.length,
        flows,
        keyOf,
        rows,
        total: sum(ledger, flows),
    };
}

export interface Slot {
    from: string;
    key: string;
    parts: { color: string; id: string; name: string; value: number }[];
    to: string;
    total: number;
}

/** One bar per day, or per month in a year, each stacked by group with the largest at the bottom. */
export function slotsOf(
    ledger: Ledger,
    span: Period,
    flows: readonly Flow[],
    keyOf: KeyOf,
    order: readonly Group[]
): Slot[] {
    const rank = new Map(order.map((group, index) => [group.id, index]));
    const known = new Map(order.map((group) => [group.id, group]));
    const slots =
        span.key.length === 4
            ? Array.from({ length: MONTHS_IN_YEAR }, (_, index) =>
                  periodOf(`${span.key}-${String(index + 1).padStart(2, "0")}`, ledger.firstDayOfMonth)
              ).map((month) => ({ from: month.from, key: month.key, to: month.to }))
            : daysFrom(span.from, span.to).map((day) => ({ from: day, key: day, to: day }));
    return slots.map((slot) => {
        const inside = flows.filter(({ row }) => row.day >= slot.from && row.day <= slot.to);
        const parts = [...Map.groupBy(inside, ({ row }) => keyOf(row).key)]
            .map(([id, members]) => {
                const group = known.get(id);
                return {
                    color: group?.color ?? "",
                    id,
                    name: group?.name ?? "",
                    value: round(ledger, sum(ledger, members)),
                };
            })
            .toSorted((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
        return {
            ...slot,
            parts,
            total: round(
                ledger,
                parts.reduce((all, part) => all + part.value, 0)
            ),
        };
    });
}

export interface Axis {
    cap: number;
    clipped: boolean;
    ticks: number[];
}

const STEPS = [1, 2, 5];

/** A y-axis for bars. One bar far above the rest is cut off at the next round figure so the others stay readable. */
export function axisFor(totals: readonly number[]): Axis {
    const sorted = totals.map(Math.abs).toSorted((a, b) => b - a);
    const [top = 0, second = 0] = sorted;
    const clipped = second > 0 && top > second * OUTLIER_RATIO;
    const reach = clipped ? Math.ceil((second * CAP_HEADROOM) / CAP_STEP) * CAP_STEP : top;
    const cap = reach > 0 ? reach : CAP_STEP;
    const rough = cap / 2.5;
    const magnitude = 10 ** Math.floor(Math.log10(rough));
    const step = (STEPS.find((each) => each * magnitude >= rough) ?? 10) * magnitude;
    const reachTick = clipped ? cap : Math.ceil(cap / step) * step;
    const full = Array.from({ length: Math.floor(reachTick / step + 1e-9) + 1 }, (_, index) => index * step);
    return { cap: reachTick, clipped, ticks: full };
}

export interface Weekly {
    label: Window;
    value: number;
}

/** One tag's spending in each week the span touches, the first and last cut to the span. */
export function weeksOf(ledger: Ledger, span: Period, flows: readonly Flow[], firstWeekday: number): Weekly[] {
    const out: Weekly[] = [];
    let { from } = span;
    while (from <= span.to) {
        const start = from;
        const weekday = new Date(`${from}T12:00:00Z`).getUTCDay();
        const untilEnd = (7 - ((weekday - (firstWeekday - 1) + 7) % 7)) % 7 || 7;
        const end = addDays(start, untilEnd - 1);
        const to = end < span.to ? end : span.to;
        out.push({
            label: { from: start, to },
            value: round(
                ledger,
                flows.filter(({ row }) => row.day >= start && row.day <= to).reduce((all, { value }) => all + value, 0)
            ),
        });
        from = addDays(to, 1);
    }
    return out;
}

export interface Subs {
    amount: number;
    id: string;
    name: string;
    share: number;
}

/** One category split into its subcategories, a share of the category. */
export function subcategoriesOf(ledger: Ledger, flows: readonly Flow[]): Subs[] {
    const keyOf = keyerFor(ledger, "subcategory");
    const spent = sum(ledger, flows);
    return groupFlows(ledger, flows, keyOf).map((group) => ({
        amount: group.amount,
        id: group.id,
        name: group.name,
        share: spent === 0 ? 0 : group.amount / spent,
    }));
}

export interface TagBreakdown {
    baseTagged: number | null;
    baseTotal: number | null;
    count: number;
    flows: readonly Flow[];
    rows: BreakdownRow[];
    split: TagSplit;
    tagged: number;
    total: number;
    untagged: number;
}

export function tagBreakdownOf(
    ledger: Ledger,
    scope: Scope,
    span: Period,
    query: Omit<BreakdownQuery, "dimension">,
    tags: TagBooks
): TagBreakdown {
    const { basis, category, kind, metric } = query;
    const last = ledger.today < span.to ? ledger.today : span.to;
    const flows = flowsOf(ledger, scope, metric, span.from, last, category);
    const split = splitByTag(ledger, flows, tags);
    const baseline = baselineOf(ledger, span, kind, basis);
    const windows = baseline?.windows.length ?? 1;
    const pooled = baseline
        ? baseline.windows.flatMap(({ from, to }) => flowsOf(ledger, scope, metric, from, to, category))
        : [];
    const baseSplit = splitByTag(ledger, pooled, tags);
    const rows = split.groups.map((group) => {
        const before = baseSplit.groups.find((each) => each.id === group.id)?.amount ?? 0;
        return withBase(ledger, group, baseline ? round(ledger, before / windows) : 0);
    });
    return {
        baseTagged: baseline ? round(ledger, sum(ledger, baseSplit.tagged) / windows) : null,
        baseTotal: baseline ? round(ledger, sum(ledger, pooled) / windows) : null,
        count: flows.length,
        flows,
        rows,
        split,
        tagged: sum(ledger, split.tagged),
        total: sum(ledger, flows),
        untagged: sum(ledger, split.untagged),
    };
}

/** The row that moved most against its base, for the sentence that closes a strip. */
export const largestMover = (rows: readonly BreakdownRow[]) =>
    rows
        .filter((row) => row.base > 0 && row.delta !== 0)
        .toSorted((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0] ?? null;
