import type { AreaChartDatum } from "panelui-web/area-chart";
import type { SankeyLink, SankeyNode } from "panelui-web/sankey-chart";

import { categoriesOf } from "./dashboard-series";
import type { SeriesCategory } from "./dashboard-series";
import { endOfDay, round, rowsBetween, total } from "./dashboard-series-ledger";
import type { Ledger, Scope } from "./dashboard-series-ledger";
import { netWorthPoints } from "./dashboard-series-net-worth";
import { periodOf, shiftPeriodKey } from "./dashboard-series-period";
import type { Period } from "./dashboard-series-period";

const largestFirst = (categories: readonly SeriesCategory[]) => categories.toSorted((a, b) => b.total - a.total);

const lastDayOf = (ledger: Ledger, period: Period) => (ledger.today < period.to ? ledger.today : period.to);

interface CategorySpend {
    color: string;
    id: string;
    label: string;
    share: number;
    value: number;
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

interface CashFlow {
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

export interface MonthTotal {
    ended: boolean;
    income: number;
    key: string;
    spent: number;
}

const lastPeriods = (ledger: Ledger, period: Period, months: number) =>
    Array.from({ length: months }, (_, index) =>
        periodOf(shiftPeriodKey(period.key, index + 1 - months), ledger.firstDayOfMonth)
    );

export function monthlyTotals(ledger: Ledger, period: Period, scope: Scope, months = 12): MonthTotal[] {
    const firstDay = ledger.rows.reduce((first, row) => (row.day < first ? row.day : first), ledger.today);
    return lastPeriods(ledger, period, months)
        .filter((each) => each.to >= firstDay || each.key === period.key)
        .map((each) => {
            const last = lastDayOf(ledger, each);
            return {
                ended: each.to < ledger.today,
                income: total(ledger, rowsBetween(ledger, scope, each.from, last, true)),
                key: each.key,
                spent: total(ledger, rowsBetween(ledger, scope, each.from, last, false)),
            };
        });
}

export function netWorthHistory(ledger: Ledger, period: Period, scope: Scope, months = 12): AreaChartDatum[] {
    const periods = lastPeriods(ledger, period, months);
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
