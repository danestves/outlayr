import { describe, expect, it } from "vite-plus/test";

import { proConfirmed } from "./use-pro-locked";

describe("proConfirmed", () => {
    it("withholds Pro until the entitlement resolves to Pro", () => {
        expect(proConfirmed("unresolved", true)).toBe(false);
        expect(proConfirmed("free", true)).toBe(false);
        expect(proConfirmed("pro", true)).toBe(true);
    });

    it("grants everything in a build that cannot sell Pro", () => {
        expect(proConfirmed("unresolved", false)).toBe(true);
    });
});
