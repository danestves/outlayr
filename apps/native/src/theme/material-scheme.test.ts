import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "@jest/globals";
import {
    argbFromHex,
    Hct,
    hexFromArgb,
    SchemeContent,
    SchemeExpressive,
    SchemeFidelity,
    SchemeFruitSalad,
    SchemeMonochrome,
    SchemeNeutral,
    SchemeRainbow,
    SchemeTonalSpot,
    SchemeVibrant,
} from "@material/material-color-utilities";
import type { DynamicScheme } from "@material/material-color-utilities";

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
import { MATERIAL_ROLES } from "./material-roles";
import type { MaterialRoleColors } from "./material-roles";
import {
    AA_TEXT_CONTRAST,
    BRAND_TOKENS,
    contrastRatio,
    ensureContrast,
    hexFromRgba,
    materialVariables,
    mixOver,
} from "./material-scheme";
import type { MaterialTheme } from "./material-scheme";

const THEMES: readonly MaterialTheme[] = ["light", "dark"];

const SEEDS = [
    ...Array.from({ length: 16 }, (_, index) => hexFromArgb(Hct.from(index * 22.5, 48, 50).toInt())),
    "#8a8c8e",
];

const VARIANTS = {
    content: SchemeContent,
    expressive: SchemeExpressive,
    fidelity: SchemeFidelity,
    fruitSalad: SchemeFruitSalad,
    monochrome: SchemeMonochrome,
    neutral: SchemeNeutral,
    rainbow: SchemeRainbow,
    tonalSpot: SchemeTonalSpot,
    vibrant: SchemeVibrant,
} as const;

function roles(scheme: DynamicScheme): MaterialRoleColors {
    // SAFETY: `fromEntries` loses the key union; one entry per role.
    return Object.fromEntries(MATERIAL_ROLES.map((role) => [role, hexFromArgb(scheme[role])])) as MaterialRoleColors;
}

const cases = SEEDS.flatMap((seed) =>
    Object.entries(VARIANTS).flatMap(([variant, Scheme]) =>
        THEMES.map((theme) => ({
            label: `${variant} ${seed} ${theme}`,
            theme,
            variables: materialVariables(roles(new Scheme(Hct.fromInt(argbFromHex(seed)), theme === "dark", 0)), theme),
        }))
    )
);

function failures(label: string, variables: Record<string, string>): string[] {
    const value = (token: string) => variables[`--${token}`];
    const found: string[] = [];
    const measure = (text: string, ground: string, textValue = value(text), groundValue = value(ground)) => {
        const ratio = contrastRatio(textValue, groundValue);
        if (ratio < AA_TEXT_CONTRAST) {
            found.push(`${label}: ${text} on ${ground} = ${ratio.toFixed(2)}:1`);
        }
    };

    for (const token of TEXT_TOKENS) {
        for (const ground of GROUNDS) {
            measure(token, ground);
        }
    }
    for (const [token, fill] of Object.entries(INVERSE_TOKENS)) {
        measure(token, fill);
    }
    for (const [token, grounds] of Object.entries({ ...FIRST_RUN_TEXT, ...M3_TEXT_ON })) {
        for (const ground of grounds) {
            measure(token, ground);
        }
    }
    for (const fill of WHITE_TEXT_FILLS) {
        measure("white", fill, "#ffffff");
    }
    for (const [text, tone] of Object.entries(ON_WASH)) {
        measure(text, `${tone} wash`, value(text), mixOver(value(tone), value("background"), WASH_ALPHA));
    }
    return found;
}

const stylesheet = readFileSync(join(import.meta.dirname, "../../global.css"), "utf-8");

function themeTokens(theme: MaterialTheme): Map<string, string> {
    const open = stylesheet.indexOf("{", stylesheet.indexOf(`@variant ${theme} {`));
    let depth = 0;
    for (let index = open; index < stylesheet.length; index += 1) {
        depth += Number(stylesheet[index] === "{") - Number(stylesheet[index] === "}");
        if (depth === 0) {
            const body = stylesheet.slice(open + 1, index);
            return new Map([...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()]));
        }
    }
    throw new Error(`global.css no longer declares @variant ${theme}`);
}

describe("the Android palette, across wallpapers and scheme styles", () => {
    it(`holds ${AA_TEXT_CONTRAST}:1 for every pair the app relies on`, () => {
        expect(cases).toHaveLength(SEEDS.length * Object.keys(VARIANTS).length * THEMES.length);
        expect(cases.flatMap(({ label, variables }) => failures(label, variables))).toStrictEqual([]);
    });

    it("rewrites every variable the stylesheet declares, so no component keeps paper and ink", () => {
        for (const { theme, variables } of cases.slice(0, 2)) {
            const declared = [...themeTokens(theme).keys()].map((token) => `--${token}`).sort();
            expect(Object.keys(variables).sort()).toStrictEqual(declared);
        }
    });
});

describe("the brand values the pipeline starts from", () => {
    it("are the ones the stylesheet declares", () => {
        for (const theme of THEMES) {
            const declared = themeTokens(theme);
            for (const [token, value] of Object.entries(BRAND_TOKENS[theme])) {
                expect([token, value]).toStrictEqual([token, declared.get(token)]);
            }
        }
    });
});

describe("ensureContrast", () => {
    it("leaves a colour that already clears untouched", () => {
        expect(ensureContrast("#17150f", ["#f2f0ea"])).toBe("#17150f");
    });

    it("darkens a light-theme colour and lightens a dark-theme one, until it clears", () => {
        const darkened = ensureContrast("#9a9a9a", ["#ffffff"]);
        const lightened = ensureContrast("#555555", ["#101010"]);
        expect(contrastRatio(darkened, "#ffffff")).toBeGreaterThanOrEqual(AA_TEXT_CONTRAST);
        expect(contrastRatio(lightened, "#101010")).toBeGreaterThanOrEqual(AA_TEXT_CONTRAST);
        expect(Number.parseInt(darkened.slice(1, 3), 16)).toBeLessThan(0x9a);
        expect(Number.parseInt(lightened.slice(1, 3), 16)).toBeGreaterThan(0x55);
    });
});

describe("hexFromRgba", () => {
    it("drops the alpha byte @expo/ui appends and lowercases", () => {
        expect(hexFromRgba("#3A6A1EFF")).toBe("#3a6a1e");
        expect(hexFromRgba("#3a6a1e")).toBe("#3a6a1e");
    });

    it("refuses anything else rather than writing it into the stylesheet", () => {
        expect(() => hexFromRgba("rgba(0, 0, 0, 1)")).toThrow();
    });
});
