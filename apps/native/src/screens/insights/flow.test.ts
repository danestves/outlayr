import { describe, expect, it } from "vite-plus/test";

import type { CategoryBreakdownEntry } from "@/data/insights";

import { cashFlow } from "./flow";
import type { CashFlow } from "./flow";

const NAMES = { hubIn: "Income", hubOut: "Spent", kept: "Kept", other: "Other", savings: "Savings" };
const COLORS = { hub: "#555", kept: "#0a0", other: "#999", savings: "#c00" };

function entry(id: string, amount: number): CategoryBreakdownEntry {
    return { amount, color: "#53915A", delta: null, emoji: null, fraction: 0, icon: null, id, name: id };
}

function flowOf(income: number, spent: number, sources: CategoryBreakdownEntry[], targets: CategoryBreakdownEntry[]) {
    return cashFlow({ colors: COLORS, income, names: NAMES, sources, spent, targets });
}

function total(flow: CashFlow, side: "source" | "target") {
    return flow.links.filter((link) => link[side] === "hub").reduce((sum, link) => sum + link.value, 0);
}

function valueOf(flow: CashFlow, id: string) {
    return flow.links.find((link) => link.source === id || link.target === id)?.value;
}

describe("cash flow", () => {
    it("sends what was not spent to Kept, so both sides of the hub match", () => {
        const flow = flowOf(6650, 3523, [entry("paycheck", 6400), entry("freelance", 250)], [entry("rent", 3523)]);

        expect(valueOf(flow, "kept")).toBeCloseTo(3127, 6);
        expect(valueOf(flow, "savings")).toBeUndefined();
        expect(total(flow, "target")).toBeCloseTo(total(flow, "source"), 6);
        expect(flow.nodes[0].label).toBe("Income");
    });

    it("draws the overspend as Savings instead of Kept", () => {
        const flow = flowOf(3200, 4050, [entry("paycheck", 3200)], [entry("rent", 1850), entry("shopping", 2200)]);

        expect(valueOf(flow, "savings")).toBeCloseTo(850, 6);
        expect(valueOf(flow, "kept")).toBeUndefined();
        expect(total(flow, "target")).toBeCloseTo(total(flow, "source"), 6);
        expect(flow.nodes[0].label).toBe("Spent");
    });

    it("folds the tail and uncategorized spending into Other, but never a single leftover", () => {
        const six = ["a", "b", "c", "d", "e", "f"].map((id, index) => entry(id, 100 - index));
        const folded = flowOf(1000, 600, [], six);
        const shown = folded.nodes.filter((node) => node.id.startsWith("out:")).map((node) => node.id);

        expect(shown).toStrictEqual(["out:a", "out:b", "out:c", "out:d", "out:other"]);
        expect(valueOf(folded, "out:other")).toBeCloseTo(600 - 100 - 99 - 98 - 97, 6);

        const five = flowOf(1000, 490, [], six.slice(0, 5));
        expect(five.nodes.some((node) => node.id === "out:other")).toBe(false);
        expect(valueOf(five, "out:e")).toBe(96);
    });

    it("keeps a category that shows up on both sides as two nodes", () => {
        const flow = flowOf(500, 200, [entry("refunds", 500)], [entry("refunds", 200)]);
        const ids = flow.nodes.map((node) => node.id);

        expect(new Set(ids).size).toBe(ids.length);
        expect(flow.links.every((link) => link.source !== link.target)).toBe(true);
    });
});
