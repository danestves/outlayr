import { parseCsv } from "@outlayr/money/csv-read";
import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vite-plus/test";

import { csvFromArchive } from "./import-archive";

const zipOf = (files: Record<string, string>) =>
    zipSync(Object.fromEntries(Object.entries(files).map(([name, text]) => [name, strToU8(text)])));

describe("csvFromArchive", () => {
    it("joins an expenses and an income database, marking the income rows", () => {
        const inner = zipOf({
            "Budget/Expenses.csv": "Name,Date,Amount,Category\nBakery,2026-07-29,12.50,Food",
            "Budget/Income.csv": "Source,Date,Amount\nPayroll,2026-07-30,2400",
        });
        const csv = csvFromArchive(zipSync({ "Export-1.zip": inner }));

        expect(parseCsv(csv ?? "").slice(1)).toStrictEqual([
            ["2026-07-29", "12.50", "Food", "Bakery", "Expense", ""],
            ["2026-07-30", "2400", "Payroll", "Payroll", "Income", ""],
        ]);
    });

    it("reads the _all copy of a database instead of its filtered view", () => {
        const csv = csvFromArchive(
            zipOf({
                "Spending 1f2e_all.csv": "Name,Date,Amount\nBakery,2026-07-29,12.50\nRent,2026-07-01,900",
                "Spending 1f2e.csv": "Name,Date,Amount\nBakery,2026-07-29,12.50",
            })
        );

        expect(parseCsv(csv ?? "")).toHaveLength(3);
    });

    it("marks a lone spending table's positive amounts as spending", () => {
        const csv = csvFromArchive(zipOf({ "Expenses 9a1b_all.csv": "Name,Date,Amount\nBakery,2026-07-29,12.50" }));

        expect(parseCsv(csv ?? "")[1]?.at(-1)).toBe("Expense");
    });

    it("leaves a signed bank export to its signs", () => {
        const csv = csvFromArchive(
            zipOf({ "bank.csv": "Date,Description,Amount\n2026-07-29,Bakery,-12.50\n2026-07-30,Payroll,2400" })
        );

        expect(parseCsv(csv ?? "")[0]).toStrictEqual(["Date", "Description", "Amount"]);
    });

    it("answers null for a zip with no CSV in it", () => {
        expect(csvFromArchive(zipOf({ "notes.md": "# Hi" }))).toBeNull();
    });
});
