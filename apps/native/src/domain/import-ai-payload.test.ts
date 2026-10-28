import { describe, expect, it } from "vite-plus/test";

import type { ColumnMapping, ParsedImportFile } from "@/data/transfer-core";
import { parseCsvAmount, parseCsvDate } from "@/domain/transaction-csv";

import { buildClassificationPayload, MAX_LABELS, scrubLabel } from "./import-ai-payload";

const DRAFT: Record<keyof ColumnMapping, number | null> = {
    amount: 2,
    category: 1,
    currency: null,
    date: 0,
    exchangeRate: null,
    exchangeRateType: null,
    note: 1,
    type: null,
};

const CATEGORY_TREE = [{ children: ["Coffee"], name: "Food" }];

const PARSED: ParsedImportFile = {
    header: ["date", "description", "amount"],
    rows: [
        ["03/08/2026", "Coffee Shop", "12,50"],
        ["04/08/2026", "Unknown Store 12345", "99,99"],
    ],
    width: 3,
};

describe("scrubLabel", () => {
    it("strips a run of 4 or more digits", () => {
        expect(scrubLabel("Card ending 1234 purchase")).toBe("Card ending purchase");
    });

    it("keeps a run of exactly 3 digits", () => {
        expect(scrubLabel("Aisle 123 Store")).toBe("Aisle 123 Store");
    });

    it("strips a run of 4+ fullwidth digits", () => {
        expect(scrubLabel("Card ending ４５６７ purchase")).toBe("Card ending purchase");
    });
});

describe("buildClassificationPayload", () => {
    it("returns null when there are no unresolved labels", () => {
        expect(
            buildClassificationPayload({
                categoryTree: CATEGORY_TREE,
                draft: DRAFT,
                parsed: PARSED,
                unresolvedLabels: [],
            })
        ).toBeNull();
    });

    it("caps labels at MAX_LABELS", () => {
        const manyLabels = Array.from({ length: 250 }, (_, i) => `Merchant ${i}`);

        const payload = buildClassificationPayload({
            categoryTree: CATEGORY_TREE,
            draft: DRAFT,
            parsed: PARSED,
            unresolvedLabels: manyLabels,
        });

        expect(payload).not.toBeNull();
        expect(payload?.labels.length).toBeLessThanOrEqual(MAX_LABELS);
    });

    it("a genuinely non-null payload carries the requested category tree verbatim", () => {
        const payload = buildClassificationPayload({
            categoryTree: CATEGORY_TREE,
            draft: DRAFT,
            parsed: PARSED,
            unresolvedLabels: ["Coffee Shop"],
        });

        expect(payload).not.toBeNull();
        expect(payload?.categoryTree).toStrictEqual(CATEGORY_TREE);
        expect(payload?.labels).toStrictEqual(["Coffee Shop"]);
    });

    it("no raw CSV date or amount string appears anywhere in the stringified payload", () => {
        const payload = buildClassificationPayload({
            categoryTree: CATEGORY_TREE,
            draft: DRAFT,
            parsed: PARSED,
            unresolvedLabels: ["Coffee Shop", "Unknown Store 12345"],
        });

        expect(payload).not.toBeNull();
        const json = JSON.stringify(payload);

        const rawDate = "03/08/2026";
        const rawAmount = "12,50";
        expect(parseCsvDate(rawDate, "dd/MM/yyyy")).not.toBeNull();
        expect(parseCsvAmount(rawAmount, ",")).not.toBeNull();
        expect(json).not.toContain(rawDate);
        expect(json).not.toContain(rawAmount);
    });
});
