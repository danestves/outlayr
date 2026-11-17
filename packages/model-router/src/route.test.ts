import { describe, expect, it } from "vite-plus/test";

import { escalation } from "./route.ts";

describe("escalation", () => {
    it("retries a new-category background answer on Sonnet", () => {
        const request = { budget: "open", feature: "background_suggest" } as const;
        expect(escalation(request, { isNewCategory: true })).toMatchObject({
            model: "standard",
            reason: "new_category",
        });
        expect(escalation(request, { isNewCategory: false })).toBeNull();
    });

    it("never reaches Sonnet once the budget is exhausted", () => {
        expect(escalation({ budget: "exhausted", feature: "background_suggest" }, { isNewCategory: true })).toBeNull();
    });

    it("never retries while the user is typing", () => {
        expect(escalation({ budget: "open", feature: "category_suggest" }, { isNewCategory: true })).toBeNull();
    });
});
