import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "@jest/globals";

import { ACCENTS, DEFAULT_ACCENT } from "@/domain/accent";

import {
    FIRST_RUN_TEXT,
    GROUNDS,
    INVERSE_TOKENS,
    M3_TEXT_ON,
    ON_WASH,
    TEXT_TOKENS,
    WASH_ALPHA,
    WHITE_TEXT_FILLS,
} from "./contrast-pairs";

const nativeRoot = join(import.meta.dirname, "../..");

/** WCAG 2.2 AA, normal text. */
const AA_TEXT_CONTRAST = 4.5;
const CHANNEL_WEIGHTS = [0.2126, 0.7152, 0.0722] as const;
const SIX_HEX_DIGITS = /^[0-9a-f]{6}$/i;

/** Hand-derived here rather than imported from `shade.ts`, so a broken helper cannot certify a broken stylesheet. */
function relativeLuminance(hex: string): number {
    const value = hex.trim().replace(/^#/, "");
    if (!SIX_HEX_DIGITS.test(value)) {
        throw new Error(`not a #RRGGBB hex: ${hex}`);
    }
    const int = Number.parseInt(value, 16);
    const channels = [(int >> 16) & 255, (int >> 8) & 255, int & 255];
    return channels.reduce((sum, channel, index) => {
        const v = channel / 255;
        const linear = v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        return sum + CHANNEL_WEIGHTS[index] * linear;
    }, 0);
}

function contrastRatio(a: string, b: string): number {
    const first = relativeLuminance(a);
    const second = relativeLuminance(b);
    return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}
const stylesheet = readFileSync(join(nativeRoot, "global.css"), "utf-8");

type Theme = "light" | "dark";
const THEMES: readonly Theme[] = ["light", "dark"];

/** `--warning` (1.51:1) has no `text-warning` utility, which the no-text-utility test keeps true. */
const NON_TEXT_TOKENS = [
    "surface",
    "surface-secondary",
    "grouped-background",
    "border",
    "separator",
    "warning",
    "chip",
    "danger-fill",
    "gold-fill",
    "rail-over",
    "rail-track",
    "fr-rule",
    "m3-outline",
    "m3-outline-variant",
    "m3-scrim",
] as const;

/** First-run tokens only ever sit on their own ground, so the set is measured against itself. */
const FIRST_RUN_GROUNDS = ["fr-ground", "fr-card"] as const;

const WHITE = "#ffffff";

/** The list is the guard: a new call site fails until its fill joins {@link WHITE_TEXT_FILLS}. */
const WHITE_TEXT_SITES = [
    "components/currency-picker-row.tsx",
    "screens/budgets/components/budget-row.tsx",
    "screens/log/components/swipeable-transaction-row.tsx",
] as const;

function pairKey(theme: Theme, token: string, ground: string): string {
    return `${theme}: --${token} on --${ground}`;
}

function themeTokens(theme: Theme): Map<string, string> {
    const open = stylesheet.indexOf(`@variant ${theme} {`);
    if (open === -1) {
        throw new Error(`global.css no longer declares @variant ${theme}`);
    }
    return new Map([...braced(open).matchAll(/--([\w-]+):\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()]));
}

function exposedTokens(): Map<string, string> {
    const open = stylesheet.indexOf("@theme inline");
    if (open === -1) {
        throw new Error("global.css no longer declares @theme inline");
    }
    return new Map(
        [...braced(open).matchAll(/--color-([\w-]+):\s*var\(--([\w-]+)\);/g)].map((match) => [match[1], match[2]])
    );
}

function braced(from: number): string {
    const open = stylesheet.indexOf("{", from);
    let depth = 0;
    for (let index = open; index < stylesheet.length; index += 1) {
        if (stylesheet[index] === "{") {
            depth += 1;
        } else if (stylesheet[index] === "}") {
            depth -= 1;
            if (depth === 0) {
                return stylesheet.slice(open + 1, index);
            }
        }
    }
    throw new Error(`unbalanced braces at offset ${from} of global.css`);
}

function tokenValue(theme: Theme, token: string): string {
    const value = themeTokens(theme).get(token);
    if (!value) {
        throw new Error(`@variant ${theme} no longer declares --${token}`);
    }
    return value;
}

function textUtilities(): Set<string> {
    const names = new Set<string>();
    for (const file of sourceFiles(join(nativeRoot, "src"))) {
        const source = readFileSync(file, "utf-8");
        for (const match of source.matchAll(/\btext-([a-z][a-z-]*[a-z])\b/g)) {
            names.add(match[1]);
        }
    }
    return names;
}

function byCodeUnit(a: string, b: string): number {
    if (a === b) {
        return 0;
    }
    return a < b ? -1 : 1;
}

function whiteTextSites(): string[] {
    const src = join(nativeRoot, "src");
    return sourceFiles(src)
        .filter((file) => /\btext-white\b/.test(readFileSync(file, "utf-8")))
        .map((file) => relative(src, file))
        .sort(byCodeUnit);
}

function sourceFiles(dir: string): string[] {
    const found: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) {
            found.push(...sourceFiles(path));
        } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
            found.push(path);
        }
    }
    return found;
}

describe("contrast maths", () => {
    it("gives the defining 21:1 for pure black on pure white", () => {
        expect(contrastRatio("#000000", "#ffffff")).toBe(21);
    });

    it("refuses a value it cannot measure rather than passing it", () => {
        expect(() => relativeLuminance("rgba(241, 120, 121, 0.22)")).toThrow();
        expect(() => relativeLuminance("#fff")).toThrow();
    });
});

describe("the token layer", () => {
    it("classifies every token it exposes to the utilities", () => {
        const classified = new Set<string>([
            ...TEXT_TOKENS,
            ...Object.keys(INVERSE_TOKENS),
            ...NON_TEXT_TOKENS,
            ...FIRST_RUN_GROUNDS,
            ...Object.keys(FIRST_RUN_TEXT),
            ...Object.keys(M3_TEXT_ON),
            ...Object.values(M3_TEXT_ON).flat(),
        ]);
        for (const token of exposedTokens().values()) {
            expect(classified.has(token)).toBeTruthy();
        }
    });

    it("declares every exposed token in both themes", () => {
        for (const theme of THEMES) {
            const declared = themeTokens(theme);
            for (const token of exposedTokens().values()) {
                expect(declared.has(token)).toBeTruthy();
            }
        }
    });
});

describe("wCAG AA for text on every ground its theme paints", () => {
    for (const theme of THEMES) {
        it(`holds ${AA_TEXT_CONTRAST}:1 in ${theme}`, () => {
            const failures: string[] = [];
            for (const token of TEXT_TOKENS) {
                for (const ground of GROUNDS) {
                    const key = pairKey(theme, token, ground);
                    const ratio = contrastRatio(tokenValue(theme, token), tokenValue(theme, ground));
                    if (ratio < AA_TEXT_CONTRAST) {
                        failures.push(`${key} = ${ratio.toFixed(2)}:1`);
                    }
                }
            }
            expect(failures).toStrictEqual([]);
        });
    }

    it("holds the floor for the first-run palette on the grounds it is written over", () => {
        const failures: string[] = [];
        for (const theme of THEMES) {
            for (const [token, grounds] of Object.entries(FIRST_RUN_TEXT)) {
                for (const ground of grounds) {
                    const ratio = contrastRatio(tokenValue(theme, token), tokenValue(theme, ground));
                    if (ratio < AA_TEXT_CONTRAST) {
                        failures.push(`${pairKey(theme, token, ground)} = ${ratio.toFixed(2)}:1`);
                    }
                }
            }
        }
        expect(failures).toStrictEqual([]);
    });

    it("holds the floor for each Material 3 text role on the fills it is paired with", () => {
        const failures: string[] = [];
        for (const theme of THEMES) {
            for (const [token, fills] of Object.entries(M3_TEXT_ON)) {
                for (const fill of fills) {
                    const ratio = contrastRatio(tokenValue(theme, token), tokenValue(theme, fill));
                    if (ratio < AA_TEXT_CONTRAST) {
                        failures.push(`${pairKey(theme, token, fill)} = ${ratio.toFixed(2)}:1`);
                    }
                }
            }
        }
        expect(failures).toStrictEqual([]);
    });

    it("holds the floor for each inverse token on the fill it is named for", () => {
        const failures: string[] = [];
        for (const theme of THEMES) {
            for (const [token, fill] of Object.entries(INVERSE_TOKENS)) {
                const ratio = contrastRatio(tokenValue(theme, token), tokenValue(theme, fill));
                if (ratio < AA_TEXT_CONTRAST) {
                    failures.push(`${pairKey(theme, token, fill)} = ${ratio.toFixed(2)}:1`);
                }
            }
        }
        expect(failures).toStrictEqual([]);
    });
});

describe("verdict badge text over its own wash", () => {
    const over = (tone: string, ground: string) => {
        const channel = (hex: string, offset: number) => Number.parseInt(hex.slice(offset, offset + 2), 16);
        return `#${[1, 3, 5]
            .map((offset) =>
                Math.round(WASH_ALPHA * channel(tone, offset) + (1 - WASH_ALPHA) * channel(ground, offset))
                    .toString(16)
                    .padStart(2, "0")
            )
            .join("")}`;
    };

    for (const theme of THEMES) {
        it(`holds ${AA_TEXT_CONTRAST}:1 in ${theme}`, () => {
            const failures: string[] = [];
            for (const [text, tone] of Object.entries(ON_WASH)) {
                const wash = over(tokenValue(theme, tone), tokenValue(theme, "background"));
                const ratio = contrastRatio(tokenValue(theme, text), wash);
                if (ratio < AA_TEXT_CONTRAST) {
                    failures.push(`${theme}: --${text} on its wash = ${ratio.toFixed(2)}:1`);
                }
            }
            expect(failures).toStrictEqual([]);
        });
    }
});

describe("fills that carry literal white text", () => {
    it(`holds ${AA_TEXT_CONTRAST}:1 for white over each of them, in both themes`, () => {
        const failures: string[] = [];
        for (const theme of THEMES) {
            for (const fill of WHITE_TEXT_FILLS) {
                const ratio = contrastRatio(WHITE, tokenValue(theme, fill));
                if (ratio < AA_TEXT_CONTRAST) {
                    failures.push(`${theme}: white on --${fill} = ${ratio.toFixed(2)}:1`);
                }
            }
        }
        expect(failures).toStrictEqual([]);
    });

    it("names every file that writes text-white", () => {
        expect(whiteTextSites()).toStrictEqual([...WHITE_TEXT_SITES]);
    });

    it("draws a declared fill at each of those sites", () => {
        for (const site of WHITE_TEXT_SITES) {
            const source = readFileSync(join(nativeRoot, "src", site), "utf-8");
            expect(WHITE_TEXT_FILLS.some((fill) => new RegExp(`\\bbg-${fill}\\b`).test(source))).toBeTruthy();
        }
    });
});

describe("tokens classified as fills", () => {
    it("never appears as a text utility", () => {
        const written = textUtilities();
        for (const token of NON_TEXT_TOKENS) {
            expect(!written.has(token)).toBeTruthy();
        }
    });
});

describe("every accent a user can pick", () => {
    for (const theme of THEMES) {
        it(`holds ${AA_TEXT_CONTRAST}:1 on every ${theme} ground`, () => {
            const failures: string[] = [];
            for (const accent of ACCENTS) {
                for (const ground of GROUNDS) {
                    const ratio = contrastRatio(accent[theme], tokenValue(theme, ground));
                    if (ratio < AA_TEXT_CONTRAST) {
                        failures.push(`${theme}: ${accent.key} on --${ground} = ${ratio.toFixed(2)}:1`);
                    }
                }
            }
            expect(failures).toStrictEqual([]);
        });
    }

    it("leads with the value the stylesheet declares", () => {
        for (const theme of THEMES) {
            expect(DEFAULT_ACCENT[theme]).toBe(tokenValue(theme, "tint"));
        }
    });

    it("keeps each accent's stored value where the settings that hold it expect", () => {
        expect(ACCENTS.map(({ key, value }) => [key, value])).toStrictEqual([
            ["vermilion", 0],
            ["plum", 1],
            ["ochre", 2],
            ["prussian", 3],
            ["pine", 4],
        ]);
    });
});
