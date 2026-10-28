import { describe, expect, it } from "vite-plus/test";

import type { ImportEntry } from "@/data/transfer-core";

import { dedupFingerprint, fingerprintsOf, flagDuplicates } from "./import-dedup";

function entry(overrides: Partial<ImportEntry> = {}): ImportEntry {
    return {
        amount: 42.5,
        categoryId: "cat-1",
        currency: null,
        date: new Date(2026, 7, 1, 9, 30),
        income: false,
        note: "Coffee Shop",
        ...overrides,
    };
}

describe("dedupFingerprint", () => {
    it("matches two rows on the same day, amount, direction and note", () => {
        const a = dedupFingerprint(entry({ date: new Date(2026, 7, 1, 8, 0) }));
        const b = dedupFingerprint(entry({ date: new Date(2026, 7, 1, 20, 0) }));
        expect(a).toBe(b);
    });

    it("differs when the day differs", () => {
        const a = dedupFingerprint(entry({ date: new Date(2026, 7, 1) }));
        const b = dedupFingerprint(entry({ date: new Date(2026, 7, 2) }));
        expect(a).not.toBe(b);
    });

    it("differs when the direction differs", () => {
        const a = dedupFingerprint(entry({ income: false }));
        const b = dedupFingerprint(entry({ income: true }));
        expect(a).not.toBe(b);
    });

    it("tells two amounts apart in the third decimal", () => {
        const a = dedupFingerprint(entry({ amount: 12.341 }));
        const b = dedupFingerprint(entry({ amount: 12.344 }));

        expect(a).not.toBe(b);
    });

    it("still matches an amount that has been through arithmetic", () => {
        expect(dedupFingerprint(entry({ amount: 0.1 + 0.2 }))).toBe(dedupFingerprint(entry({ amount: 0.3 })));
    });

    it("folds note text the same way merchantKey does", () => {
        const a = dedupFingerprint(entry({ note: "Café Central" }));
        const b = dedupFingerprint(entry({ note: "CAFE CENTRAL" }));
        expect(a).toBe(b);
    });

    it("does not match differing note text — no fuzzy matching", () => {
        const a = dedupFingerprint(entry({ note: "Coffee Shop" }));
        const b = dedupFingerprint(entry({ note: "Coffee Shop #2" }));
        expect(a).not.toBe(b);
    });
});

describe("flagDuplicates", () => {
    it("flags exact indices whose fingerprint already exists", () => {
        const entries = [entry({ note: "Coffee Shop" }), entry({ note: "Rent" }), entry({ note: "Coffee Shop" })];
        const existing = fingerprintsOf([
            {
                amount: entries[0].amount,
                date: entries[0].date,
                income: entries[0].income,
                note: entries[0].note,
            },
        ]);
        expect(flagDuplicates(entries, existing)).toStrictEqual(new Set([0, 2]));
    });
});
