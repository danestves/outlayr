import { describe, expect, it } from "@jest/globals";

import { cn } from "./tw";

const SIZES = [
    "text-micro",
    "text-eyebrow",
    "text-label",
    "text-footnote",
    "text-caption",
    "text-subtitle",
    "text-body",
    "text-callout",
    "text-headline",
    "text-title",
    "text-hero",
] as const;

const TONES = ["text-foreground", "text-muted", "text-danger", "text-income", "text-future", "text-tint"] as const;

describe("cn keeps a size and a tone from cancelling", () => {
    it("preserves every size token against every tone", () => {
        for (const size of SIZES) {
            for (const tone of TONES) {
                const out = cn(size, tone) ?? "";
                expect(out.includes(size)).toBeTruthy();
                expect(out.includes(tone)).toBeTruthy();
            }
        }
    });

    it("lets a later tracking token replace an earlier one", () => {
        expect(cn("tracking-eyebrow", "tracking-hero")).toBe("tracking-hero");
    });
});
