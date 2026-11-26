import { decimalsFor } from "@outlayr/money/currency";
import { describe, expect, it } from "vite-plus/test";

import { parseAmount } from "@/lib/account-writes";
import { numberLocale } from "@/lib/exchange-locale";

import { amountText } from "./fields";

// The editable draft used to take the reader's locale, and the form parses this same string back.
const draft = amountText as (amount: number, currency: string, readerLocale?: string) => string;

describe("editable amount text", () => {
    it.each(["XCG", "USD"])("round-trips a %s figure for an es-ES reader", (currency) => {
        const readerLocale = numberLocale("es-ES", []);
        expect(readerLocale).toBe("es-ES");
        for (const amount of [12_345.67, 1000, 250_000]) {
            expect(parseAmount(draft(amount, currency, readerLocale), decimalsFor(currency))).toBe(amount);
        }
    });
});
