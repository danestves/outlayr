import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "@jest/globals";

import { WIDGET_PALETTE } from "./palette";
import type { WidgetPalette } from "./palette";

const PALETTE_VARIABLES = {
    background: "--background",
    border: "--border",
    income: "--income",
    ink: "--foreground",
    muted: "--muted",
    over: "--over-budget",
    subtle: "--subtle",
} satisfies Record<keyof WidgetPalette, string>;

const CSS = readFileSync(join(import.meta.dirname, "../../global.css"), "utf-8");

function variantBlock(variant: "light" | "dark"): string {
    const marker = `@variant ${variant} {`;
    const open = CSS.indexOf(marker);
    if (open === -1) {
        throw new Error(`global.css declares no \`${marker}\` block`);
    }
    const start = open + marker.length;
    const end = CSS.indexOf("}", start);
    if (end === -1) {
        throw new Error(`global.css never closes the \`${marker}\` block`);
    }
    return CSS.slice(start, end);
}

function declaredValue(block: string, variable: string): string | null {
    const match = block.match(new RegExp(`${variable}\\s*:\\s*([^;]+);`));
    return match ? match[1].trim() : null;
}

describe("widget palette", () => {
    for (const variant of ["light", "dark"] as const) {
        it(`matches every ${variant} token declared in global.css`, () => {
            const block = variantBlock(variant);
            for (const [name, variable] of Object.entries(PALETTE_VARIABLES)) {
                expect(WIDGET_PALETTE[variant][name as keyof WidgetPalette]).toBe(declaredValue(block, variable));
            }
        });
    }
});
