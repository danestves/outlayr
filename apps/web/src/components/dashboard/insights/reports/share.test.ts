import { describe, expect, it } from "vite-plus/test";

import type { Label, Report, ReportRow } from "./model";
import { reportOf, snapshotOf } from "./share";

const label = (name: string): Label => ({ color: "#c2371b", id: name, name, special: null });

const row = (name: string, values: number[], change: number | null): ReportRow => {
    const total = values.reduce((all, value) => all + value, 0);
    return { average: total / values.length, change, label: label(name), total, values };
};

const report = (measure: Report["measure"]): Report => ({
    columns: [
        { from: "2026-09-01", key: "2026-09", to: "2026-09-30" },
        { from: "2026-10-01", key: "2026-10", to: "2026-10-31" },
    ],
    entries: 4,
    measure,
    rise: { delta: 250, label: label("Rent") },
    rows: [row("Rent", [1750, 2000], 0.07), row("Dining", [150, 100], -0.2)],
    sources: [],
    totals: row("", [1900, 2100], 0.05),
});

const input = (measure: Report["measure"], amounts: boolean) => ({
    amounts,
    currency: "USD",
    definition: { columns: "month", measure, rows: "category" } as const,
    name: "Month by category",
    report: report(measure),
    rowName: (each: Label) => each.name,
});

describe("a shared copy", () => {
    it("carries shares of the total and no amount when amounts are off", () => {
        const shared = snapshotOf(input("spending", false));

        expect(shared.unit).toBe("percent");
        expect(shared.totals).toEqual({ average: 50, change: 0.05, total: 100, values: [47.5, 52.5] });
        expect(shared.rows[0]).toMatchObject({ average: 46.9, total: 93.8, values: [43.8, 50] });
        expect(shared.rise?.delta).toBe(6.3);
        expect(JSON.stringify(shared)).not.toMatch(/1750|2000|1900|2100|4000/);
    });

    it("keeps amounts for a measure that has no whole to take shares of", () => {
        expect(snapshotOf(input("net", false)).unit).toBe("amount");
    });

    it("reads back as the report it was made from", () => {
        const source = report("spending");
        const { report: back } = reportOf(snapshotOf(input("spending", true)));

        expect(back.totals.values).toEqual(source.totals.values);
        expect(back.rows.map((each) => [each.label.name, each.total, each.change])).toEqual(
            source.rows.map((each) => [each.label.name, each.total, each.change])
        );
        expect(back.rise).toMatchObject({ delta: 250, label: { name: "Rent" } });
    });
});
