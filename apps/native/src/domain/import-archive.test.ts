import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vite-plus/test";

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

    it("picks the largest table when the databases differ", () => {
        const bytes = zip({
            "Finance Tracker/Expenses 3c.csv": 'Name,Date,Amount\nA,"October 1, 2026",1\nB,"October 2, 2026",2\n',
            "Finance Tracker/Income 4d.csv": 'Source,Date,Amount\nPaycheck,"October 15, 2026",3150\n',
        });
        expect(rowsOf(bytes).map((row) => row[0])).toStrictEqual(["A", "B"]);
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
