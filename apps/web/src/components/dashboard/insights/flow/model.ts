import { merchantKey } from "@outlayr/money/merchant-key";

import { categoryBudget, change } from "@/lib/dashboard-series";
import type { CategoryBudget } from "@/lib/dashboard-series";
import { cashFlow } from "@/lib/dashboard-series-insights";
import { round, rowsBetween, total } from "@/lib/dashboard-series-ledger";
import type { Ledger, LedgerRow, Scope } from "@/lib/dashboard-series-ledger";
import { periodOf, priorSlice } from "@/lib/dashboard-series-period";
import type { Period } from "@/lib/dashboard-series-period";

export type EdgeTone = "category" | "kept" | "savings";

export interface FlowEdge {
    amount: number;
    categoryId: string | null;
    color: string;
    id: string;
    label: string;
    /** Of income, or of spending when the span spent more than came in. `null` for the draw on savings. */
    share: number | null;
    tone: EdgeTone;
}

export interface FlowMap {
    deficit: boolean;
    hub: { amount: number; kind: "income" | "spent" };
    income: number;
    kept: number;
    sources: FlowEdge[];
    spent: number;
    targets: FlowEdge[];
}

const IN_PREFIX = "in:";
const OUT_PREFIX = "out:";
const KEPT_COLOR = "var(--color-app-income)";
const SAVINGS_COLOR = "var(--color-app-spend)";

const shareOf = (amount: number, whole: number) => (whole > 0 ? amount / whole : 0);
const lastDay = (ledger: Ledger, span: Period) => (ledger.today < span.to ? ledger.today : span.to);

/** The span as a flow: each income category into one hub, the hub out to each spending category and what was kept. */
export function flowMap(ledger: Ledger, span: Period, scope: Scope): FlowMap {
    const { income, kept, links, nodes, spent } = cashFlow(ledger, span, scope);
    const deficit = spent > income;
    const names = new Map(nodes.map((node) => [node.id, node]));
    const sources = links.flatMap((link): FlowEdge[] => {
        if (link.target !== "hub") {
            return [];
        }
        if (link.source === "savings") {
            return [
                {
                    amount: link.value,
                    categoryId: null,
                    color: SAVINGS_COLOR,
                    id: "savings",
                    label: "",
                    share: null,
                    tone: "savings",
                },
            ];
        }
        const node = names.get(link.source);
        return [
            {
                amount: link.value,
                categoryId: link.source.slice(IN_PREFIX.length),
                color: node?.color ?? SAVINGS_COLOR,
                id: link.source,
                label: node?.label ?? "",
                share: shareOf(link.value, income),
                tone: "category",
            },
        ];
    });
    const whole = deficit ? spent : income;
    const spendEdges = links.flatMap((link): FlowEdge[] => {
        if (link.source !== "hub" || !link.target.startsWith(OUT_PREFIX)) {
            return [];
        }
        const node = names.get(link.target);
        return [
            {
                amount: link.value,
                categoryId: link.target.slice(OUT_PREFIX.length),
                color: node?.color ?? KEPT_COLOR,
                id: link.target,
                label: node?.label ?? "",
                share: shareOf(link.value, whole),
                tone: "category",
            },
        ];
    });
    const keptEdges: FlowEdge[] =
        kept > 0
            ? [
                  {
                      amount: kept,
                      categoryId: null,
                      color: KEPT_COLOR,
                      id: "kept",
                      label: "",
                      share: shareOf(kept, income),
                      tone: "kept",
                  },
              ]
            : [];
    return {
        deficit,
        hub: deficit ? { amount: spent, kind: "spent" } : { amount: income, kind: "income" },
        income,
        kept: round(ledger, income - spent),
        sources,
        spent,
        targets: [...keptEdges, ...spendEdges],
    };
}

export interface FlowEntry {
    amount: number;
    at: number;
    day: string;
    id: string;
    merchant: string;
}

export interface DrillMerchant {
    amount: number;
    count: number;
    name: string;
    share: number;
}

export interface Drill {
    budget: CategoryBudget | null;
    entries: FlowEntry[];
    merchants: DrillMerchant[];
    ofIncome: number | null;
    prior: Period;
    spent: number;
    versus: { amount: number; delta: number | null } | null;
}

const entryOf = (row: LedgerRow, fallback: string): FlowEntry => ({
    amount: row.amount,
    at: row.at,
    day: row.day,
    id: row.id,
    merchant: row.note.trim() || fallback,
});

/** One category inside the span: where it went by merchant, its entries and how it stands against the span before. */
export function drillOf(ledger: Ledger, span: Period, scope: Scope, categoryId: string, budgeted: boolean): Drill {
    const last = lastDay(ledger, span);
    const fallback = ledger.categories.get(categoryId)?.name ?? "";
    const rows = rowsBetween(ledger, scope, span.from, last, false).filter((row) => row.topId === categoryId);
    const spent = total(ledger, rows);
    const income = total(ledger, rowsBetween(ledger, scope, span.from, last, true));
    const groups = Map.groupBy(
        rows.toSorted((a, b) => b.at - a.at),
        (row) => merchantKey(row.note) || merchantKey(fallback)
    );
    const merchants = [...groups.values()]
        .map((members) => {
            const amount = total(ledger, members);
            return {
                amount,
                count: members.length,
                name: members[0]?.note.trim() || fallback,
                share: spent > 0 ? amount / spent : 0,
            };
        })
        .toSorted((a, b) => b.amount - a.amount);
    const before = priorSlice(span, ledger.today, ledger.firstDayOfMonth);
    const priorSpent = total(
        ledger,
        rowsBetween(ledger, scope, before.from, before.to, false).filter((row) => row.topId === categoryId)
    );
    const opening = ledger.rows.reduce((day, row) => (row.day < day ? row.day : day), ledger.today);
    return {
        budget: budgeted ? categoryBudget(ledger, categoryId, span) : null,
        entries: rows.toSorted((a, b) => b.at - a.at).map((row) => entryOf(row, fallback)),
        merchants,
        ofIncome: income > 0 ? spent / income : null,
        prior: periodOf(before.key, ledger.firstDayOfMonth),
        spent,
        versus:
            opening > before.to
                ? null
                : { amount: round(ledger, spent - priorSpent), delta: change(spent, priorSpent) },
    };
}
