import { describe, expect, it } from "vite-plus/test";

import { formatCsvRow, parseCsv } from "./csv";

describe("formatCsvRow", () => {
    it("leaves plain fields bare", () => {
        expect(formatCsvRow(["Bakery", "12.50", "EUR"])).toBe("Bakery,12.50,EUR");
    });

    it("quotes a field containing a comma instead of dropping it", () => {
        expect(formatCsvRow(["Lunch, twice"])).toBe('"Lunch, twice"');
    });

    it("doubles embedded quotes", () => {
        expect(formatCsvRow(['He said "hi"'])).toBe('"He said ""hi"""');
    });

    it("quotes a field containing a newline", () => {
        expect(formatCsvRow(["two\nlines"])).toBe('"two\nlines"');
    });
});

describe("parseCsv", () => {
    it("splits plain rows on commas", () => {
        expect(parseCsv("a,b,c\n1,2,3")).toStrictEqual([
            ["a", "b", "c"],
            ["1", "2", "3"],
        ]);
    });

    it("reads a quoted field containing a comma as one field", () => {
        expect(parseCsv('"Lunch, twice",5')).toStrictEqual([["Lunch, twice", "5"]]);
    });

    it("unescapes doubled quotes", () => {
        expect(parseCsv('"He said ""hi""",5')).toStrictEqual([['He said "hi"', "5"]]);
    });

    it("accepts CRLF line endings", () => {
        expect(parseCsv("a,b\r\n1,2\r\n")).toStrictEqual([
            ["a", "b"],
            ["1", "2"],
        ]);
    });

    it("drops a trailing newline rather than emitting an empty row", () => {
        expect(parseCsv("a,b\n")).toStrictEqual([["a", "b"]]);
    });

    it("keeps a row whose every field is empty out of the result", () => {
        expect(parseCsv("a,b\n,\n1,2")).toStrictEqual([
            ["a", "b"],
            ["1", "2"],
        ]);
    });

    it("returns no rows for empty input", () => {
        expect(parseCsv("")).toStrictEqual([]);
    });

    it("strips a UTF-8 byte order mark from the first field", () => {
        expect(parseCsv("﻿Date,Note")).toStrictEqual([["Date", "Note"]]);
    });
});
