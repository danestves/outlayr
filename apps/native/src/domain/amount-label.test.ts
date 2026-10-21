import { describe, expect, it } from "@jest/globals";

import { CATALOGS, EN } from "@/i18n/catalog";
import type { TranslateFn } from "@/i18n/context";
import { translate } from "@/i18n/translate";

import { rowAmountLabel } from "./amount-label";

const en: TranslateFn = (key, params) => translate(key, { catalog: EN, fallback: EN, params });

const es: TranslateFn = (key, params) => translate(key, { catalog: CATALOGS.es, fallback: EN, params });

const USD = { amount: 1240.5, code: "USD" };

describe("rowAmountLabel states the direction in words", () => {
    it("names income", () => {
        expect(rowAmountLabel({ ...USD, income: true }, en)).toMatch(/Income/);
    });

    it("says which way a transfer went on an account's own page, and stays neutral without a side", () => {
        expect(rowAmountLabel({ ...USD, income: null, transferSign: "+" }, en)).toBe("$1,240.50 moved in");
        expect(rowAmountLabel({ ...USD, income: null, transferSign: "-" }, es)).toBe("Salida de $1,240.50");
        expect(rowAmountLabel({ ...USD, income: null }, en)).toBe("$1,240.50 moved");
    });
});

describe("rowAmountLabel carries the figure it labels", () => {
    it("reads the grouped amount with its currency mark", () => {
        const label = rowAmountLabel({ ...USD, income: false }, en);

        expect(label).toBe("Expense $1,240.50");
    });

    it("uses the row's own currency, not a fixed one", () => {
        expect(rowAmountLabel({ amount: 12, code: "EUR", income: false }, en)).toMatch(/€12\.00/);
        expect(rowAmountLabel({ amount: 1240, code: "JPY", income: false }, en)).toBe("Expense ¥1,240");
    });

    /** 1240.50 lands on 1240, not 1241: `roundMoney` is half-even. */
    it("drops the cents when the display setting does", () => {
        expect(rowAmountLabel({ ...USD, income: false, showCents: false }, en)).toBe("Expense $1,240");
    });

    it("never doubles the sign for a negative magnitude", () => {
        expect(rowAmountLabel({ amount: -1240.5, code: "USD", income: false }, en)).toBe(
            rowAmountLabel({ amount: 1240.5, code: "USD", income: false }, en)
        );
    });
});
