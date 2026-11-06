import { describe, expect, it } from "vite-plus/test";

import { buildImportPlan, categoryKey } from "@/data/transfer-core";
import type { StatementRow } from "@/lib/cloud-ai";

import { resolveImportMapping } from "./import-mapping";
import { STATEMENT_DRAFT, statementToParsedImport } from "./import-statement";
import { deduceDateFormat, detectDecimalSeparator } from "./transaction-csv";

function planFor(rows: readonly StatementRow[]) {
    const parsed = statementToParsedImport(rows);
    const resolution = resolveImportMapping(STATEMENT_DRAFT);
    if (!resolution.ok) {
        throw new Error("The statement draft must resolve");
    }
    const { mapping } = resolution.value;
    const links = new Map(rows.map((row) => [categoryKey(row.label), "category"]));
    return buildImportPlan(
        parsed.rows,
        mapping,
        deduceDateFormat(parsed.rows.map((row) => row[mapping.date] ?? "")) ?? "",
        detectDecimalSeparator(parsed.rows.map((row) => row[mapping.amount] ?? "")),
        links,
        new Map([["category", false]]),
        false
    );
}

const row = (overrides: Partial<StatementRow>): StatementRow => ({
    amount: -12.5,
    currency: null,
    date: "2026-03-03",
    label: "STARBUCKS",
    ...overrides,
});

describe(statementToParsedImport, () => {
    it("keeps a statement's day in any zone, instead of parsing it as UTC midnight", () => {
        const { entries } = planFor([row({ date: "2026-03-01" })]);

        expect(entries[0]?.date.getFullYear()).toBe(2026);
        expect(entries[0]?.date.getMonth()).toBe(2);
        expect(entries[0]?.date.getDate()).toBe(1);
    });

    it("books money in as income and money out as an expense, whatever the category says", () => {
        const { entries } = planFor([row({ amount: -12.5 }), row({ amount: 2000, label: "NOMINA" })]);

        expect(entries.map((entry) => [entry.amount, entry.income])).toStrictEqual([
            [12.5, false],
            [2000, true],
        ]);
    });

    it.each([
        [-1234.5, 1234.5],
        [-1.234, 1.234],
        [-1000, 1000],
        [-1_234_567.89, 1_234_567.89],
    ])("reads %d back exactly, so no amount is mistaken for a thousands group", (amount, expected) => {
        expect(planFor([row({ amount })]).entries[0]?.amount).toBe(expected);
    });

    it("carries a printed currency and leaves the rest to the ledger's", () => {
        const { entries } = planFor([row({ currency: "EUR" }), row({ label: "OTRO" })]);

        expect(entries.map((entry) => entry.currency)).toStrictEqual(["EUR", null]);
    });
});
