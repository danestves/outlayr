import { describe, expect, it } from "@jest/globals";
import { PICKABLE_CURRENCY_CODES } from "@outlayr/money/catalog";

import { currencyPickerRows } from "./currency-picker-rows";

const codes = (rows: ReturnType<typeof currencyPickerRows>) =>
    rows.flatMap((row) => (row.kind === "currency" ? [row.code] : []));

const sections = (rows: ReturnType<typeof currencyPickerRows>) =>
    rows.flatMap((row) => (row.kind === "header" ? [row.section] : []));

const hints = (rows: ReturnType<typeof currencyPickerRows>) => rows.filter((row) => row.kind === "hint");

describe("the currency picker's rows", () => {
    it("teaches the gesture under an empty cluster, above the whole catalogue", () => {
        const rows = currencyPickerRows([], "");
        expect(sections(rows)).toStrictEqual(["favourites", "all"]);
        expect(hints(rows)).toHaveLength(1);
        expect(codes(rows)).toStrictEqual([...PICKABLE_CURRENCY_CODES]);
    });

    it("retires the hint the moment a favourite exists", () => {
        expect(hints(currencyPickerRows(["USD"], ""))).toStrictEqual([]);
    });

    it("never repeats a favourite in the list below the cluster", () => {
        const rows = currencyPickerRows(["USD", "VES"], "");
        const listed = codes(rows);
        expect(listed.filter((code) => code === "USD")).toHaveLength(1);
        expect(listed.filter((code) => code === "VES")).toHaveLength(1);
    });

    it("marks the cluster's rows as favourites and the rest as not", () => {
        const rows = currencyPickerRows(["USD"], "");
        const favourites = rows.filter((row) => row.kind === "currency" && row.favourite);
        expect(favourites).toHaveLength(1);
        expect(favourites[0].kind === "currency" && favourites[0].code).toBe("USD");
    });

    it("holds the order the favourites were added in", () => {
        const rows = currencyPickerRows(["VES", "USD"], "");
        expect(codes(rows).slice(0, 2)).toStrictEqual(["VES", "USD"]);
    });

    it("drops a stored favourite the catalogue no longer knows", () => {
        const rows = currencyPickerRows(["USD", "XXX"], "");
        expect(codes(rows).slice(0, 1)).toStrictEqual(["USD"]);
        expect(!codes(rows).includes("XXX" as never)).toBeTruthy();
    });

    it("leaves a search flat, because the search is already the shortcut", () => {
        const rows = currencyPickerRows(["USD", "VES"], "eur");
        expect(sections(rows)).toStrictEqual([]);
        expect(codes(rows).includes("EUR")).toBeTruthy();
    });

    it("searches by code and by name, ignoring case and padding", () => {
        expect(codes(currencyPickerRows([], "  JpY ")).includes("JPY")).toBeTruthy();
        expect(codes(currencyPickerRows([], "yen")).includes("JPY")).toBeTruthy();
    });
});

describe("where a section closes", () => {
    const lastCodes = (rows: ReturnType<typeof currencyPickerRows>) =>
        rows.flatMap((row) => (row.kind === "currency" && row.last ? [row.code] : []));

    it("closes on the row before a header, and on the very last row", () => {
        const rows = currencyPickerRows(["USD", "VES"], "");
        const closingCodes = lastCodes(rows);
        expect(closingCodes[0]).toBe("VES");
        expect(closingCodes).toHaveLength(2);
        expect(closingCodes[1]).toBe(rows.at(-1)?.kind === "currency" ? closingCodes[1] : null);
    });
});
