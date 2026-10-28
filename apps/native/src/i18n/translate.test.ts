import { describe, expect, it } from "vite-plus/test";

import { interpolate, translate } from "./translate";

const EN = {
    entry_one: "{count} entry",
    entry_other: "{count} entries",
    greeting: "Hello",
    pair: "{a} and {b}",
    welcome: "Welcome, {name}",
} as const;

const ES = {
    entry_one: "{count} registro",
    entry_other: "{count} registros",
    greeting: "Hola",
    pair: "{a} y {b}",
    welcome: "Bienvenido, {name}",
} as const;

describe("interpolate", () => {
    it("substitutes a named placeholder", () => {
        expect(interpolate("Welcome, {name}", { name: "Ada" })).toBe("Welcome, Ada");
    });

    it("substitutes every occurrence of the same placeholder", () => {
        expect(interpolate("{a}-{a}", { a: "x" })).toBe("x-x");
    });

    it("leaves an unmatched placeholder in place rather than printing undefined", () => {
        expect(interpolate("Welcome, {name}", { other: "x" })).toBe("Welcome, {name}");
    });

    it("renders an explicit null as empty rather than leaking the token", () => {
        expect(interpolate("Delete '{name}'?", { name: null })).toBe("Delete ''?");
    });

    it("lets an abbreviated date end the sentence with a single period", () => {
        expect(interpolate("Moins qu'en {prior}.", { prior: "18 - 24 oct." })).toBe("Moins qu'en 18 - 24 oct.");
        expect(interpolate("Le {date}, puis", { date: "25 oct." })).toBe("Le 25 oct., puis");
    });
});

describe("translate", () => {
    it("interpolates params into the catalog value", () => {
        expect(
            translate("welcome", {
                catalog: ES,
                fallback: EN,
                params: { name: "Ada" },
            })
        ).toBe("Bienvenido, Ada");
    });

    it("falls back to English when the catalog lacks the key", () => {
        expect(translate("greeting", { catalog: {}, fallback: EN })).toBe("Hello");
    });

    it("picks the singular form when count is 1", () => {
        expect(translate("entry", { catalog: ES, fallback: EN, params: { count: 1 } })).toBe("1 registro");
    });

    it("picks the plural form for zero", () => {
        expect(translate("entry", { catalog: ES, fallback: EN, params: { count: 0 } })).toBe("0 registros");
    });

    it("ignores count when the key has no plural forms", () => {
        expect(
            translate("greeting", {
                catalog: ES,
                fallback: EN,
                params: { count: 3 },
            })
        ).toBe("Hola");
    });

    it("returns the key when it is absent from both catalogs", () => {
        expect(translate("nope", { catalog: {}, fallback: {} })).toBe("nope");
    });
});
