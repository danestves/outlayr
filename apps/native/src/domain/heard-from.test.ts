import { describe, expect, it } from "vite-plus/test";

import { heardFromOrder, heardFromProperties } from "./heard-from";

describe("heardFromProperties", () => {
    it("sends a trimmed detail, capped at 80 characters, only for other", () => {
        expect(heardFromProperties("other", "  a podcast  ")).toStrictEqual({
            detail: "a podcast",
            source: "other",
            $set: { heard_from: "other" },
        });
        expect(heardFromProperties("other", "x".repeat(100))).toHaveProperty("detail", "x".repeat(80));
        expect(heardFromProperties("other", "   ")).not.toHaveProperty("detail");
        expect(heardFromProperties("friend", "my sister")).toStrictEqual({
            source: "friend",
            $set: { heard_from: "friend" },
        });
    });
});

describe("heardFromOrder", () => {
    it("keeps other last whatever the shuffle does", () => {
        const order = heardFromOrder(() => 0.99);
        expect(order.at(-1)).toBe("other");
        expect(new Set(order).size).toBe(10);
    });
});
