import { describe, expect, it } from "vite-plus/test";

import { flyleafDate } from "./flyleaf";

describe("flyleafDate", () => {
    it("writes the English form", () => {
        expect(flyleafDate(new Date(2026, 6, 30), "en")).toBe("July 30, 2026");
    });

    it("writes the Spanish form", () => {
        expect(flyleafDate(new Date(2026, 6, 30), "es")).toBe("30 de julio de 2026");
    });
});
