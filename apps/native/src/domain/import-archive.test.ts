import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vite-plus/test";

import { guessMapping } from "@/data/transfer-core";

import { parseCsv } from "./csv";
import { csvFromArchive, isZip } from "./import-archive";
import { HARD_PARSE_REJECT_CHARS } from "./import-diagnosis";

const zip = (files: Record<string, string | Uint8Array>) =>
    zipSync(
        Object.fromEntries(
            Object.entries(files).map(([name, content]) => [
                name,
                typeof content === "string" ? strToU8(content) : content,
            ])
        )
    );

const rowsOf = (bytes: Uint8Array) => parseCsv(csvFromArchive(bytes) ?? "").slice(1);

describe("csvFromArchive", () => {
    it("takes the _all twin over the filtered view", () => {
        const bytes = zip({
            "Expenses 1218a55a.csv": 'Name,Date,Amount\nCoffee,"October 27, 2026",5.25\n',
            "Expenses 1218a55a_all.csv":
                'Name,Date,Amount\nCoffee,"October 27, 2026",5.25\nRent,"September 1, 2026",1600\n',
            "Expenses/Coffee 1a2b.md": "# Coffee",
        });
        expect(rowsOf(bytes)).toHaveLength(2);
    });

    it("refuses an archive whose CSV text is larger than an import reads", () => {
        expect(() => csvFromArchive(zip({ "Huge.csv": "a".repeat(HARD_PARSE_REJECT_CHARS + 1) }))).toThrow(RangeError);
    });

    it("joins one database per month into a single table", () => {
        const bytes = zip({
            "Budget 2026/October 2b.csv": "Item,Day,Cost\nGroceries,25,$88.10\n",
            "Budget 2026/September 1a.csv": 'Item,Day,Cost\nRent,1,"$1,450.00"\nBooks,21,$32.99\n',
        });
        expect(
            rowsOf(bytes)
                .map((row) => row[0])
                .toSorted()
        ).toStrictEqual(["Books", "Groceries", "Rent"]);
    });

    it("keeps an income table apart from an expense table with the same columns", () => {
        const bytes = zip({
            "Money/Expenses 1a.csv": 'Name,Date,Amount\nRent,"October 1, 2026",1600\n',
            "Money/Income 2b.csv": 'Name,Date,Amount\nPaycheck,"October 15, 2026",3150\n',
        });
        const [header, ...rows] = parseCsv(csvFromArchive(bytes) ?? "");
        const type = guessMapping(header ?? []).type ?? -1;
        expect(rows.map((row) => [row[1], row[type]])).toStrictEqual([
            ["1600", ""],
            ["3150", "Income"],
        ]);
    });

    it("joins a template's expense and income tables and leaves its lookup tables out", () => {
        const bytes = zip({
            "Finance Tracker/Accounts 5e.csv":
                "Name,Type,Balance\nAmex Gold,Credit card,0\nChecking,Bank,0\nSavings,Bank,0\n",
            "Finance Tracker/Categories 6f.csv": "Name,Budget\nGroceries,400\nDining,150\nRent,1600\nFun,90\n",
            "Finance Tracker/Expenses 3c.csv":
                'Name,Date,Amount,Category\nTrader Joe\'s,"October 3, 2026",$86.42,Groceries\nRefund,"October 4, 2026",-$20.00,Refunds\n',
            "Finance Tracker/Income 4d.csv": 'Source,Date,Amount\nPaycheck,"October 15, 2026","$3,150.00"\n',
        });
        const [header, ...rows] = parseCsv(csvFromArchive(bytes) ?? "");
        expect(guessMapping(header ?? [])).toMatchObject({ amount: 1, category: 2, date: 0, note: 3, type: 4 });
        expect(rows).toStrictEqual([
            ["October 3, 2026", "$86.42", "Groceries", "Trader Joe's", "", ""],
            ["October 4, 2026", "-$20.00", "Refunds", "Refund", "", ""],
            ["October 15, 2026", "$3,150.00", "Paycheck", "Paycheck", "Income", ""],
        ]);
    });

    it("takes the one ledger over a bigger table that is not one", () => {
        const bytes = zip({
            "Workspace/Gastos 1a.csv": 'Concepto,Fecha,Monto\nCafé,"October 2, 2026",2.50\n',
            "Workspace/Reading list 2b.csv": "Title,Author\nDune,Herbert\nEmma,Austen\n",
        });
        expect(rowsOf(bytes)).toStrictEqual([["Café", "October 2, 2026", "2.50"]]);
    });

    it("reads a workspace export that nests its part zips", () => {
        const inner = zip({ "Gastos 2026 c244.csv": 'Concepto,Fecha,Monto\nCafé,29/10/2026,"2,50"\n' });
        expect(rowsOf(zip({ "Export-Part-1.zip": inner }))).toStrictEqual([["Café", "29/10/2026", "2,50"]]);
    });

    it("answers null for a zip with no CSV in it", () => {
        expect(csvFromArchive(zip({ "Notes 9e.md": "# Notes" }))).toBeNull();
    });

    it("answers null for bytes that only start like a zip", () => {
        expect(csvFromArchive(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]))).toBeNull();
    });
});

describe("isZip", () => {
    it("tells a zip from a CSV by its first bytes", () => {
        expect(isZip(zip({ "a.csv": "x" }))).toBe(true);
        expect(isZip(strToU8("Name,Date,Amount"))).toBe(false);
    });
});
