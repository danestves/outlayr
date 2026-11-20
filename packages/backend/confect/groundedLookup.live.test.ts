import { liveModel } from "@outlayr/ai/testing";
import { route } from "@outlayr/model-router/route";
import { describe, expect, it } from "vite-plus/test";

import { runGroundedLookupCall } from "./groundedLookup";
import { runEdge } from "./lib/runEdge";

const model = await liveModel(route({ feature: "grounded_lookup" }));

describe.skipIf(model?.webSearch === undefined)("runGroundedLookupCall against the live model", () => {
    it("finds a merchant's official domain through the provider's own search, with sources", async () => {
        if (model === undefined) {
            throw new Error("no live model");
        }

        const outcome = await runEdge(
            runGroundedLookupCall(model, {
                currency: "VES",
                income: false,
                key: "farmatodo",
                name: "FARMATODO CARACAS",
                regionCode: "VE",
            })
        );

        expect(outcome.searchCalls).toBeGreaterThan(0);
        expect(outcome.sources.length).toBeGreaterThan(0);
        expect(outcome.candidate.domain).toMatch(/farmatodo\.com/);
    });
});
