import { array, assert, constantFrom, date, integer, property, string } from "fast-check";
import { describe, expect, it } from "vite-plus/test";

import { deduceDateFormat, detectDecimalSeparator, parseCsv, parseCsvAmount, parseCsvDate } from "./csv-read";
import { formatCsvDate, formatCsvRow, serializeCsvAmount } from "./transaction-csv";

const cell = string({ maxLength: 12 });
const row = array(cell, { maxLength: 4, minLength: 1 }).filter((cells) => cells.some((value) => value !== ""));
const rows = array(row, { maxLength: 4, minLength: 1 }).map((all) => {
    const [first = [], ...rest] = all;
    const head = first.map((value, index) => (index === 0 ? value.replace(/^\uFEFF+/u, "") : value));
    return [head, ...rest];
});

const cents = integer({ max: 10_000_000, min: -10_000_000 });
const centsMagnitude = integer({ max: 10_000_000, min: 0 });
const currency = constantFrom("USD", "EUR", "JPY", "KWD", "VES");
const separator = constantFrom(".", ",");
const instant = date({ max: new Date(Date.UTC(2100, 0, 1)), min: new Date(Date.UTC(1970, 0, 1)), noInvalidDate: true });

function grouped(whole: string, mark: string): string {
    return whole.replaceAll(/\B(?=(\d{3})+(?!\d))/g, mark);
}

function localised(amount: number, mark: "." | ","): string {
    const [whole = "0", fraction = "00"] = amount.toFixed(2).split(".");
    return mark === "," ? `${grouped(whole, ".")},${fraction}` : `${grouped(whole, ",")}.${fraction}`;
}

describe("formatCsvRow and parseCsv", () => {
    it("returns every cell it wrote, whatever the cell contains", () => {
        assert(
            property(rows, (cells) => {
                const text = cells.map(formatCsvRow).join("\n");

                expect(parseCsv(text)).toStrictEqual(cells);
            })
        );
    });

    it("reports an array of strings instead of throwing on arbitrary input", () => {
        expect(() =>
            assert(
                property(string({ maxLength: 200 }), (text) => {
                    const parsed = parseCsv(text);

                    expect(parsed.every((cells) => cells.every((value) => typeof value === "string"))).toBeTruthy();
                })
            )
        ).not.toThrow();
    });
});

describe("parseCsvAmount", () => {
    it("reads back the magnitude it serialised for the currency", () => {
        assert(
            property(cents, currency, (value, code) => {
                const amount = value / 100;

                expect(parseCsvAmount(serializeCsvAmount(amount, code))).toBe(Math.abs(amount));
            })
        );
    });

    it("answers null or a finite number, never NaN", () => {
        assert(
            property(string({ maxLength: 40 }), (text) => {
                const parsed = parseCsvAmount(text);

                expect(parsed === null || Number.isFinite(parsed)).toBeTruthy();
            })
        );
    });

    it("reads a localised column with the separator it detected", () => {
        assert(
            property(centsMagnitude, separator, (value, mark) => {
                const amount = value / 100;
                const text = localised(amount, mark);
                const detected = detectDecimalSeparator([text]);

                expect(detected).toBe(mark);
                expect(parseCsvAmount(text, detected)).toBe(amount);
            })
        );
    });
});

describe("parseCsvDate", () => {
    it("keeps the exact instant an ISO export wrote", () => {
        assert(
            property(instant, (value) => {
                const parsed = parseCsvDate(formatCsvDate(value), "ISO");

                expect(parsed?.getTime()).toBe(value.getTime());
            })
        );
    });

    it("deduces ISO for an exported instant", () => {
        assert(
            property(instant, (value) => {
                expect(deduceDateFormat([formatCsvDate(value)])).toBe("ISO");
            })
        );
    });
});
