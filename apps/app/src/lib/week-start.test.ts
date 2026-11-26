import { expect, it } from "vite-plus/test";

import { weekStart, weekStartIso } from "./week-start";

it("starts on Monday where the locale does, when nobody chose a day", () => {
    expect(weekStart(null, "es-ES")).toBe(2);
    expect(weekStart(null, "de-DE")).toBe(2);
    expect(weekStart(null, "fr-FR")).toBe(2);
});

it("keeps Sunday where the locale starts there", () => {
    expect(weekStart(null, "en-US")).toBe(1);
});

it("lets a chosen day override the locale", () => {
    expect(weekStart(1, "es-ES")).toBe(1);
    expect(weekStart(2, "en-US")).toBe(2);
});

it("falls back to Sunday when the runtime has no week info", () => {
    expect(weekStart(null, "not a locale")).toBe(1);
});

it("maps the ledger's day to the ISO day a grid counts from", () => {
    expect(weekStartIso(2)).toBe(1);
    expect(weekStartIso(1)).toBe(7);
});
