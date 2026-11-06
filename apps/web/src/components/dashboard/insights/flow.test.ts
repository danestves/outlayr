import { describe, expect, it } from "vite-plus/test";

import { flowOf } from "./flow";

const NAMES = { hub: "Cash flow", savings: "Savings" };

describe("flowOf", () => {
    const nodes = [
        { id: "hub" },
        { color: "#3a9bb5", id: "in:pay", label: "Pay" },
        { id: "kept" },
        { color: "#e2643f", id: "out:rent", label: "Rent" },
        { color: "#4f9d69", id: "out:food", label: "Food" },
    ];
    const links = [
        { source: "in:pay", target: "hub", value: 100 },
        { source: "hub", target: "kept", value: 30 },
        { color: "#e2643f", source: "hub", target: "out:rent", value: 50 },
        { color: "#4f9d69", source: "hub", target: "out:food", value: 20 },
    ];

    it("puts Kept in the last table row, after the spending rows", () => {
        const flow = flowOf({ links, nodes }, NAMES);
        expect(flow.rows.map((row) => row.id)).toEqual(["rent", "food", "kept"]);
        expect(flow.nodes.at(-1)?.id).toBe("kept");
        expect(flow.links.at(-1)?.target).toBe("kept");
    });

    it("has no Kept row when spending passed income", () => {
        const flow = flowOf(
            {
                links: [
                    { source: "savings", target: "hub", value: 40 },
                    { color: "#e2643f", source: "hub", target: "out:rent", value: 40 },
                ],
                nodes: [{ id: "hub" }, { id: "savings" }, { color: "#e2643f", id: "out:rent", label: "Rent" }],
            },
            NAMES
        );
        expect(flow.rows.map((row) => row.id)).toEqual(["rent"]);
        expect(flow.nodes.find((node) => node.id === "savings")?.label).toBe("Savings");
    });
});
