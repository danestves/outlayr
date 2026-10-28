import { describe, expect, it } from "vite-plus/test";

import { shallowEqual } from "./shallow-equal";

describe("shallowEqual", () => {
    it("compares own properties one level deep", () => {
        expect(shallowEqual({ a: 1, b: "x" }, { a: 1, b: "x" })).toBe(true);
        expect(shallowEqual({ a: 1, b: "x" }, { a: 1, b: "y" })).toBe(false);
    });

    it("detects a differing key count", () => {
        expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
        expect(shallowEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
    });

    it("handles null and primitive operands without throwing", () => {
        expect(shallowEqual(null, null)).toBe(true);
        expect(shallowEqual(null, { a: 1 })).toBe(false);
        expect(shallowEqual({ a: 1 }, null)).toBe(false);
        expect(shallowEqual(1, 1)).toBe(true);
        expect(shallowEqual(1, 2)).toBe(false);
    });

    it("treats NaN operands as equal, matching Object.is", () => {
        expect(shallowEqual({ a: Number.NaN }, { a: Number.NaN })).toBe(true);
    });
});
