import { describe, expect, it } from "vite-plus/test";

import { guessMapping } from "@/data/transfer-core";

import { resolveImportMapping } from "./import-mapping";

describe("resolveImportMapping", () => {
    it("promotes the description column into both category and note", () => {
        const draft = guessMapping(["date", "description", "amount"]);
        const result = resolveImportMapping(draft);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.mapping.category).toBe(1);
            expect(result.value.mapping.note).toBe(1);
            expect(result.value.labelSource).toBe("descriptionColumn");
        }
    });

    it("prefers the category column over a description column", () => {
        const draft = guessMapping(["date", "category", "description", "amount"]);
        const result = resolveImportMapping(draft);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.mapping.category).toBe(1);
            expect(result.value.mapping.note).toBe(2);
            expect(result.value.labelSource).toBe("categoryColumn");
        }
    });

    it("preserves optional rate columns without making them required", () => {
        const draft = {
            ...guessMapping(["date", "category", "amount"]),
            exchangeRate: 4,
            exchangeRateType: 3,
        };
        const result = resolveImportMapping(draft);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.mapping.exchangeRateType).toBe(3);
            expect(result.value.mapping.exchangeRate).toBe(4);
        }
    });

    it("fails before any network call when neither column exists", () => {
        const draft = guessMapping(["date", "amount", "balance"]);
        const result = resolveImportMapping(draft);
        expect(result).toStrictEqual({ gaps: ["noLabelColumn"], ok: false });
    });

    it("surfaces a gap for a missing date column", () => {
        const draft = guessMapping(["description", "amount"]);
        const result = resolveImportMapping(draft);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.gaps).toStrictEqual(["noDate"]);
        }
    });

    it("surfaces a gap for a missing amount column", () => {
        const draft = guessMapping(["date", "description"]);
        const result = resolveImportMapping(draft);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.gaps).toStrictEqual(["noAmount"]);
        }
    });
});
