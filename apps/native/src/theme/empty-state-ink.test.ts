import { describe, expect, it } from "vite-plus/test";

import { ghostInk } from "./empty-state-ink";

describe("ghostInk tracks the theme's foreground", () => {
    it("derives every channel from the colour it is given", () => {
        const dark = ghostInk("#ffffff", "takeover");
        for (const channel of ["wash", "fill", "rule", "edge"] as const) {
            expect(dark[channel].startsWith("rgba(255, 255, 255,")).toBeTruthy();
        }
    });
});
