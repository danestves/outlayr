import { decimalMarkOf, parseAmount } from "panelui-web/exchange";
import { expect, it } from "vite-plus/test";

import { numberLocale } from "./exchange-locale";

const typed = (text: string, language: string, browser: string[], decimals = 2) =>
    parseAmount(text, decimalMarkOf(numberLocale(language, browser)), decimals);

it("reads a comma as the decimal point for a Spanish speaker in Venezuela", () => {
    expect(typed("12,50", "es", ["es-VE"])).toBe(12.5);
    expect(typed("1.250,75", "es", ["es-VE"])).toBe(1250.75);
    expect(typed("1.250", "es", ["es-VE"])).toBe(1250);
});

it("still takes a keypad point under a comma locale, but not a grouped thousand", () => {
    expect(typed("12.5", "es", ["es-VE"])).toBe(12.5);
    expect(typed("1.234", "fr", [])).toBe(1234);
});

it("keeps English on points whatever the browser region", () => {
    expect(typed("1,250.75", "en", ["es-VE"])).toBe(1250.75);
    expect(typed("12,50", "en", ["es-VE"])).toBe(12.5);
    expect(typed("1,000", "en", [], 0)).toBe(1000);
});

it("refuses a mark that cannot be grouping instead of folding it into the figure", () => {
    expect(typed("12.3.", "en", [])).toBeNull();
    expect(typed("1,23,4", "en", [])).toBeNull();
    expect(typed("1,23.4", "en", [])).toBeNull();
    expect(typed("1.234,567.89", "en", [])).toBeNull();
});

it("holds back an amount until its last thousands group is complete", () => {
    expect(typed("1,234,56", "en", [])).toBeNull();
    expect(typed("1,234,567", "en", [])).toBe(1_234_567);
});
