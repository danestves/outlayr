import { describe, expect, it } from "vite-plus/test";

import { FLOW_HEIGHT, TARGET_GAP, flowOf, placed } from "./flow";

const spend = (id: string, value: number) => ({
    link: { source: "hub", target: `out:${id}`, value },
    node: { color: "#e2643f", id: `out:${id}`, label: id },
});

describe("flowOf", () => {
    const spending = [
        spend("rent", 50),
        spend("food", 20),
        spend("fun", 9),
        spend("bus", 8),
        spend("gym", 2),
        spend("app", 1),
    ];
    const input = {
        links: [
            { source: "in:pay", target: "hub", value: 120 },
            { source: "hub", target: "kept", value: 30 },
            ...spending.map((each) => each.link),
        ],
        nodes: [
            { id: "hub" },
            { color: "#3a9bb5", id: "in:pay", label: "Pay" },
            { id: "kept" },
            ...spending.map((each) => each.node),
        ],
    };

    it("folds the small categories into one band without losing their money, and keeps every row", () => {
        const flow = flowOf(input);
        expect(flow.targets.map((band) => [band.id, band.amount])).toEqual([
            ["out:rent", 50],
            ["out:food", 20],
            ["out:fun", 9],
            ["out:bus", 8],
            ["other", 3],
            ["kept", 30],
        ]);
        expect(flow.rows.map((row) => row.id)).toEqual(["rent", "food", "fun", "bus", "gym", "app", "kept"]);
    });

    it("draws from savings and keeps nothing when spending passed income", () => {
        const flow = flowOf({
            links: [
                { source: "in:pay", target: "hub", value: 30 },
                { source: "savings", target: "hub", value: 10 },
                { color: "#e2643f", source: "hub", target: "out:rent", value: 40 },
            ],
            nodes: [
                { id: "hub" },
                { id: "in:pay", label: "Pay" },
                { id: "savings" },
                { id: "out:rent", label: "Rent" },
            ],
        });
        expect(flow.sources.map((band) => band.kind)).toEqual(["category", "savings"]);
        expect(flow.rows.map((row) => row.id)).toEqual(["rent"]);
    });

    it("fills the chart's height on both ends of the ribbons", () => {
        const bands = placed(flowOf(input).targets, TARGET_GAP);
        const last = bands.at(-1);
        expect((last?.edge.y ?? 0) + (last?.edge.height ?? 0)).toBeCloseTo(FLOW_HEIGHT);
        expect((last?.hub.y ?? 0) + (last?.hub.height ?? 0)).toBeCloseTo(FLOW_HEIGHT);
    });
});
