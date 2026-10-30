import type { SankeyLink, SankeyNode } from "panelui-native/components/sankey-chart";

import type { CategoryBreakdownEntry } from "@/data/insights";

const SOURCES_SHOWN = 3;
const TARGETS_SHOWN = 4;
const HALF_CENT = 0.005;

export interface FlowNames {
    hubIn: string;
    hubOut: string;
    kept: string;
    other: string;
    savings: string;
}

export interface FlowColors {
    hub: string;
    kept: string;
    other: string;
    savings: string;
}

export interface CashFlowInput {
    colors: FlowColors;
    income: number;
    names: FlowNames;
    sources: readonly CategoryBreakdownEntry[];
    spent: number;
    targets: readonly CategoryBreakdownEntry[];
}

export interface CashFlow {
    links: SankeyLink[];
    nodes: SankeyNode[];
}

function fold(entries: readonly CategoryBreakdownEntry[], total: number, keep: number) {
    const shown = entries.length > keep + 1 ? entries.slice(0, keep) : entries;
    const rest = total - shown.reduce((sum, entry) => sum + entry.amount, 0);
    return { rest: rest > HALF_CENT ? rest : 0, shown };
}

export function cashFlow({ income, spent, sources, targets, names, colors }: CashFlowInput): CashFlow {
    const nodes: SankeyNode[] = [{ color: colors.hub, id: "hub", label: income >= spent ? names.hubIn : names.hubOut }];
    const links: SankeyLink[] = [];
    const into = fold(sources, income, SOURCES_SHOWN);
    const out = fold(targets, spent, TARGETS_SHOWN);

    for (const entry of into.shown) {
        nodes.push({ color: entry.color, id: `in:${entry.id}`, label: entry.name });
        links.push({ source: `in:${entry.id}`, target: "hub", value: entry.amount });
    }
    if (into.rest > 0) {
        nodes.push({ color: colors.other, id: "in:other", label: names.other });
        links.push({ source: "in:other", target: "hub", value: into.rest });
    }
    if (spent - income > HALF_CENT) {
        nodes.push({ color: colors.savings, id: "savings", label: names.savings });
        links.push({ source: "savings", target: "hub", value: spent - income });
    }

    if (income - spent > HALF_CENT) {
        nodes.push({ color: colors.kept, id: "kept", label: names.kept });
        links.push({ color: colors.kept, source: "hub", target: "kept", value: income - spent });
    }
    for (const entry of out.shown) {
        nodes.push({ color: entry.color, id: `out:${entry.id}`, label: entry.name });
        links.push({ color: entry.color, source: "hub", target: `out:${entry.id}`, value: entry.amount });
    }
    if (out.rest > 0) {
        nodes.push({ color: colors.other, id: "out:other", label: names.other });
        links.push({ color: colors.other, source: "hub", target: "out:other", value: out.rest });
    }

    return { links, nodes };
}
