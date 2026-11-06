import type { SankeyLink, SankeyNode } from "@/components/charts/sankey-chart";
import type { ChartDatum } from "@/components/charts/shared";
import type { TreemapDatum } from "@/components/charts/treemap-chart";

import { categoriesOf } from "./dashboard-series";
import type { SeriesCategory } from "./dashboard-series";
import { endOfDay, round, rowsBetween, total } from "./dashboard-series-ledger";
import type { Ledger, Scope } from "./dashboard-series-ledger";
import { netWorthPoints } from "./dashboard-series-net-worth";
import { daysFrom, periodOf, shiftPeriodKey } from "./dashboard-series-period";
import type { Period } from "./dashboard-series-period";

const largestFirst = (categories: readonly SeriesCategory[]) => categories.toSorted((a, b) => b.total - a.total);

const lastDayOf = (ledger: Ledger, period: Period) => (ledger.today < period.to ? ledger.today : period.to);

export interface CategorySpend extends TreemapDatum {
    id: string;
    share: number;
}

export function categorySpend(ledger: Ledger, period: Period, scope: Scope): CategorySpend[] {
    const rows = rowsBetween(ledger, scope, period.from, lastDayOf(ledger, period), false);
    const spent = total(ledger, rows);
    return largestFirst(categoriesOf(ledger, rows, null))
        .filter((category) => category.total > 0)
        .map((category) => ({
            color: category.color,
            id: category.id,
            label: category.name,
            share: spent > 0 ? category.total / spent : 0,
            value: category.total,
        }));
}

export interface CashFlow {
    income: number;
    kept: number;
    links: SankeyLink[];
    nodes: SankeyNode[];
    spent: number;
}

export function cashFlow(ledger: Ledger, period: Period, scope: Scope): CashFlow {
    const last = lastDayOf(ledger, period);
    const earned = rowsBetween(ledger, scope, period.from, last, true);
    const spend = rowsBetween(ledger, scope, period.from, last, false);
    const income = total(ledger, earned);
    const spent = total(ledger, spend);
    const sources = largestFirst(categoriesOf(ledger, earned, null));
    const targets = largestFirst(categoriesOf(ledger, spend, null));
    const nodes: SankeyNode[] = [{ id: "hub" }];
    const links: SankeyLink[] = [];
    for (const source of sources) {
        nodes.push({ color: source.color, id: `in:${source.id}`, label: source.name });
        links.push({ source: `in:${source.id}`, target: "hub", value: source.total });
    }
    if (spent > income) {
        nodes.push({ id: "savings" });
        links.push({ source: "savings", target: "hub", value: round(ledger, spent - income) });
    }
    const kept = round(ledger, income - spent);
    if (kept > 0) {
        nodes.push({ id: "kept" });
        links.push({ source: "hub", target: "kept", value: kept });
    }
    for (const target of targets) {
        nodes.push({ color: target.color, id: `out:${target.id}`, label: target.name });
        links.push({ color: target.color, source: "hub", target: `out:${target.id}`, value: target.total });
    }
    return { income, kept, links, nodes, spent };
}

export interface MonthlyStack {
    average: number;
    categories: readonly SeriesCategory[];
    data: readonly ChartDatum[];
}

const MONTHS_SHOWN = 6;

export function monthlyByCategory(ledger: Ledger, period: Period, scope: Scope, months = MONTHS_SHOWN): MonthlyStack {
    const periods = Array.from({ length: months }, (_, index) =>
        periodOf(shiftPeriodKey(period.key, index + 1 - months), ledger.firstDayOfMonth)
    );
    const first = periods[0]?.from ?? period.from;
    const spend = rowsBetween(ledger, scope, first, period.to, false);
    const categories = categoriesOf(ledger, spend, null);
    const slots = periods.map((each) => spend.filter((row) => row.day >= each.from && row.day <= each.to));
    const data = periods.map((each, index) => ({
        key: each.key,
        name: each.key,
        ...Object.fromEntries(
            categories.map((category) => [
                category.id,
                total(
                    ledger,
                    (slots[index] ?? []).filter((member) => member.topId === category.id)
                ),
            ])
        ),
    }));
    const started = periods.flatMap((each, index) =>
        each.from <= ledger.today ? [{ ended: each.to < ledger.today, spent: total(ledger, slots[index] ?? []) }] : []
    );
    const ended = started.filter((each) => each.ended);
    const counted = ended.length > 0 ? ended : started;
    const average = counted.length === 0 ? 0 : counted.reduce((sum, each) => sum + each.spent, 0) / counted.length;
    return { average: round(ledger, average), categories, data };
}

export interface DailySpend {
    average: number;
    averageWithout: number;
    categories: readonly SeriesCategory[];
    data: readonly ChartDatum[];
    excluded: { id: string; name: string } | null;
}

const LUMP_SHARE = 0.3;

export function dailySpend(ledger: Ledger, period: Period, scope: Scope): DailySpend {
    const spend = rowsBetween(ledger, scope, period.from, lastDayOf(ledger, period), false);
    const categories = categoriesOf(ledger, spend, null);
    const byDay = Map.groupBy(spend, (row) => row.day);
    const days = daysFrom(period.from, lastDayOf(ledger, period));
    const data = days.map((date) => ({
        date,
        ...Object.fromEntries(
            categories.map((category) => [
                category.id,
                total(
                    ledger,
                    (byDay.get(date) ?? []).filter((member) => member.topId === category.id)
                ),
            ])
        ),
    }));
    const spent = total(ledger, spend);
    const largest = spend.reduce<(typeof spend)[number] | null>(
        (top, row) => (top === null || row.amount > top.amount ? row : top),
        null
    );
    const found = categories.find((category) => category.id === largest?.topId);
    const lump = found !== undefined && found.total >= spent * LUMP_SHARE ? found : null;
    const perDay = (amount: number) => (days.length === 0 ? 0 : round(ledger, amount / days.length));
    return {
        average: perDay(spent),
        averageWithout: perDay(spent - (lump?.total ?? 0)),
        categories,
        data,
        excluded: lump ? { id: lump.id, name: lump.name } : null,
    };
}

export function netWorthHistory(ledger: Ledger, period: Period, scope: Scope, months = 12): ChartDatum[] {
    const periods = Array.from({ length: months }, (_, index) =>
        periodOf(shiftPeriodKey(period.key, index + 1 - months), ledger.firstDayOfMonth)
    );
    const worth = netWorthPoints(
        ledger,
        scope,
        periods.map((each) => Math.min(ledger.now, endOfDay(ledger, each.to)))
    );
    return periods.map((each, index) => ({
        date: lastDayOf(ledger, each),
        key: each.key,
        netWorth: worth[index]?.net ?? 0,
    }));
}
