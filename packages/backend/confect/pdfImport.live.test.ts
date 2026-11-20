/** Opt-in (RUN_LIVE_MODEL_TESTS=1 plus the configured provider's key): spends tokens. */

import { liveModel } from "@outlayr/ai/testing";
import { route } from "@outlayr/model-router/route";
import * as Effect from "effect/Effect";
import { describe, expect, it } from "vite-plus/test";

import { readStatement } from "./pdfImport";
import { statementPdf } from "./test.helpers";

const model = await liveModel(route({ feature: "pdf_import" }));

// Debits and credits in separate columns with a running balance beside them, and dates with no year: the hard layout.
const STATEMENT = statementPdf([
    ["BANCO EJEMPLO, S.A.", "Extracto de cuenta", "Marzo 2026"],
    ["Cuenta ES91 2100 0418 4502 0005 1332", "Divisa: EUR", ""],
    ["Fecha", "Concepto", "Cargo", "Abono", "Saldo"],
    ["", "Saldo anterior", "", "", "1.250,00"],
    ["03/03", "STARBUCKS CENTRO", "12,50", "", "1.237,50"],
    ["05/03", "NOMINA ACME SL", "", "2.000,00", "3.237,50"],
    ["09/03", "FARMACIA SAAS", "8,20", "", "3.229,30"],
    ["12/03", "DEVOLUCION TIENDA ROPA", "", "25,00", "3.254,30"],
    ["", "Saldo final", "", "", "3.254,30"],
    ["Pagina 1 de 1", "", "", "", ""],
]);

describe.skipIf(model === undefined)("readStatement against the live model", () => {
    it("reads signs from the columns, finds the year in the header and skips the balances", async () => {
        if (model === undefined) {
            throw new Error("no live model");
        }
        const result = await Effect.runPromise(
            readStatement(model, STATEMENT, {
                regionCode: "ES",
                today: "2026-04-02",
            })
        );

        expect(result.status).toBe("ok");
        const rows = result.status === "ok" ? result.rows : [];
        expect(rows.map((row) => [row.date, row.amount]).toSorted()).toStrictEqual(
            [
                ["2026-03-03", -12.5],
                ["2026-03-05", 2000],
                ["2026-03-09", -8.2],
                ["2026-03-12", 25],
            ].toSorted()
        );
        expect(rows.every((row) => row.currency === "EUR")).toBeTruthy();
        expect(rows.some((row) => /saldo/i.test(row.label))).toBeFalsy();
    });
});
