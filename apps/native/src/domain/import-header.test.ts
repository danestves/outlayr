import { CSV_HEADER } from "@outlayr/money/transaction-csv";
import { describe, expect, it } from "vite-plus/test";

import { guessMapping, splitHeaderAndRows } from "./import-header";

describe("splitHeaderAndRows", () => {
    it("splits off a digit-free first line as the header", () => {
        expect(
            splitHeaderAndRows([
                ["Date", "Note", "Amount"],
                ["2026-07-28", "Bakery", "12.50"],
            ])
        ).toStrictEqual({
            header: ["Date", "Note", "Amount"],
            rows: [["2026-07-28", "Bakery", "12.50"]],
        });
    });

    it("keeps a first line that already carries data", () => {
        expect(splitHeaderAndRows([["2026-07-28", "Bakery", "12.50"]])).toStrictEqual({
            header: null,
            rows: [["2026-07-28", "Bakery", "12.50"]],
        });
    });
});

describe("guessMapping", () => {
    it("maps a file this app exported without asking", () => {
        expect(guessMapping([...CSV_HEADER])).toStrictEqual({
            amount: 2,
            category: 4,
            currency: 3,
            date: 0,
            exchangeRate: 7,
            exchangeRateType: 6,
            note: 1,
            type: 5,
        });
    });

    it("ignores case and padding", () => {
        expect(guessMapping([" DATE "]).date).toBe(0);
    });

    it("maps a Spanish Notion database", () => {
        expect(guessMapping(["Nombre", "Fecha", "Monto", "Categoría"])).toMatchObject({
            amount: 2,
            category: 3,
            date: 1,
            note: 0,
        });
    });

    it("maps a Portuguese Notion export", () => {
        expect(guessMapping(["Source", "Amount", "Data", "Situação", "Tags", "Tipo"])).toMatchObject({
            amount: 1,
            category: 4,
            date: 2,
            note: 0,
            type: 5,
        });
    });

    it("takes the amount from Importe over a value-date column", () => {
        expect(guessMapping(["Fecha operación", "Fecha valor", "Concepto", "Importe", "Saldo"])).toMatchObject({
            amount: 3,
            date: 0,
        });
    });

    it("maps a Sparkasse export by its payee, booking day and Betrag", () => {
        const header = [
            "Auftragskonto",
            "Buchungstag",
            "Valutadatum",
            "Buchungstext",
            "Verwendungszweck",
            "Beguenstigter/Zahlungspflichtiger",
            "Kontonummer/IBAN",
            "BIC (SWIFT-Code)",
            "Betrag",
            "Waehrung",
            "Info",
        ];
        expect(guessMapping(header)).toMatchObject({ amount: 8, currency: 9, date: 1, note: 5 });
    });

    it("leaves a field it cannot place unassigned", () => {
        expect(guessMapping(["col1", "col2"]).amount).toBeNull();
    });
});
