import { describe, expect, it } from "vite-plus/test";

import { paymentSource, paymentSources } from "./installment-payment";

describe("paymentSource", () => {
    it("converts a dollar cuota paid from bolivares at the day's rate, to the cent", () => {
        const source = paymentSource(20, { currency: "VES", id: "banesco" }, "USD", 1 / 218.53);
        expect(source).toMatchObject({ exchangeRateType: "official", fromAmount: 4370.6, fromCurrency: "VES" });
    });

    it("moves the same amount when the currencies match", () => {
        expect(paymentSource(20, { currency: "USD", id: "zinli" }, "USD", null)?.fromAmount).toBe(20);
    });

    it("refuses a cross-currency payment with no rate for the day", () => {
        expect(paymentSource(20, { currency: "VES", id: "banesco" }, "USD", null)).toBeNull();
    });
});

describe("paymentSources", () => {
    it("offers banks, then cards and other apps, never the order's own account or a person", () => {
        const accounts = [
            { id: "visa", kind: "liability" },
            { id: "pedro", kind: "person" },
            { id: "cashea", kind: "liability" },
            { id: "banesco", kind: "asset" },
        ];
        expect(paymentSources(accounts, "cashea").map((account) => account.id)).toStrictEqual(["banesco", "visa"]);
    });
});
