import { describe, expect, it } from "vite-plus/test";

import { logEntriesEqual } from "./entries-equal";

const VIEW = { currency: "USD", language: "en", showCents: true, swapTimeLabel: false, use24Hour: false };

/** A row as a write rebuilds it: equal content, every object and date fresh. */
const row = () => ({
    amount: 1250,
    categoryName: "Coffee",
    currency: "USD",
    date: new Date("2026-10-18T09:30:00Z"),
    fee: { amount: 50, currency: "USD", date: new Date("2026-10-18T09:30:00Z"), valued: 50 },
    id: "a",
    note: "Flat white",
    valued: 1250,
});

type Row = ReturnType<typeof row>;

const section = (data: Row[], view = { ...VIEW }) => ({
    data,
    day: new Date(2026, 9, 18),
    first: true,
    today: new Date(2026, 9, 18).getTime(),
    total: -1300,
    totals: [{ amount: -1300, currency: "USD" }],
    view,
});

type Section = ReturnType<typeof section>;

const item = (entry: Row, within: Section = section([entry])) => ({
    absoluteItemIndex: 0,
    item: entry,
    itemIndex: 0,
    key: "section-0:item:a",
    kind: "item" as const,
    section: within,
    sectionIndex: 0,
});

const header = (within: Section) => ({
    key: "section-0:header",
    kind: "header" as const,
    section: within,
    sectionIndex: 0,
});

describe("logEntriesEqual", () => {
    it("holds a row a write rebuilt without changing it", () => {
        expect(logEntriesEqual(item(row()), item(row()))).toBe(true);
    });

    it.each([
        ["date", { date: new Date("2026-10-18T10:45:00Z") }],
        ["fee", { fee: { ...row().fee, amount: 75 } }],
    ])("redraws a row whose %s changed", (_field, change) => {
        expect(logEntriesEqual(item(row()), item({ ...row(), ...change }))).toBe(false);
    });

    it("redraws a row when the Log switches display currency or language", () => {
        const euros = item(row(), section([row()], { ...VIEW, currency: "EUR" }));
        const spanish = item(row(), section([row()], { ...VIEW, language: "es" }));

        expect(logEntriesEqual(item(row()), euros)).toBe(false);
        expect(logEntriesEqual(item(row()), spanish)).toBe(false);
    });

    it("redraws a header when a row under it, its place at the top, or today changed", () => {
        expect(logEntriesEqual(header(section([row()])), header(section([row()])))).toBe(true);
        expect(logEntriesEqual(header(section([row()])), header(section([{ ...row(), note: "Tea" }])))).toBe(false);
        expect(logEntriesEqual(header(section([row()])), header({ ...section([row()]), first: false }))).toBe(false);
        expect(
            logEntriesEqual(
                header(section([row()])),
                header({ ...section([row()]), today: new Date(2026, 9, 19).getTime() })
            )
        ).toBe(false);
    });
});
