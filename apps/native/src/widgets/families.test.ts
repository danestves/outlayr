import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "@jest/globals";

interface Declaration {
    configured: boolean;
    families: string[];
    initialLayout: string | undefined;
    name: string;
}

/**
 * `app.config.ts` cannot be imported here (it pulls in `expo/config` and `dotenv`), so `WIDGETS` is parsed from source.
 */
function declarations(): Declaration[] {
    const source = readFileSync(join(import.meta.dirname, "..", "..", "app.config.ts"), "utf-8");
    const start = source.indexOf("const WIDGETS = [");
    const end = source.indexOf("\n];", start);
    if (start === -1 || end === -1) {
        throw new Error("app.config.ts: no `const WIDGETS = [` literal to parse.");
    }

    // The indent widths are oxfmt's, so they move with its config.
    return source
        .slice(start, end)
        .split("\n    {\n")
        .slice(1)
        .map((chunk) => {
            const name = chunk.match(/^ {8}name: "(\w+)",$/m);
            const families = chunk.match(/supportedFamilies: \[([^\]]*)\]/);
            if (!(name && families)) {
                throw new Error(`unparsable widget entry:\n${chunk}`);
            }
            return {
                configured: chunk.includes("configuration: {"),
                families: [...families[1].matchAll(/"(\w+)"/g)].map((m) => m[1]),
                initialLayout: chunk.match(/initialLayout: "([^"]+)",$/m)?.[1],
                name: name[1],
            };
        });
}

function layout(name: string): string {
    return readFileSync(join(import.meta.dirname, `${name.toLowerCase()}.tsx`), "utf-8");
}

describe("widget declarations", () => {
    it("branches on every accessory family it declares", () => {
        for (const widget of declarations()) {
            const source = layout(widget.name);
            for (const family of widget.families) {
                if (!family.startsWith("accessory")) {
                    continue;
                }
                expect(source.includes(`"${family}"`)).toBeTruthy();
            }
        }
    });

    it("embeds every layout so a tile has a placeholder before the app first runs", () => {
        for (const widget of declarations()) {
            expect(widget.initialLayout).toBe(`src/widgets/${widget.name.toLowerCase()}.tsx`);
        }
    });

    it("reads the configuration it asks the user for", () => {
        const configured = declarations().filter((widget) => widget.configured);
        expect(configured.map((widget) => widget.name).sort((a, b) => a.localeCompare(b))).toStrictEqual([
            "Budget",
            "Insights",
            "Ledger",
        ]);
        for (const widget of configured) {
            expect(layout(widget.name).includes("environment.configuration")).toBeTruthy();
        }
    });
});
