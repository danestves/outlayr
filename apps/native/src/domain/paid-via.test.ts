import { describe, expect, it } from "vite-plus/test";

import { paidViaCharge, paidViaMemory, rememberedPaidVia } from "./paid-via";

describe("paidViaCharge", () => {
    it.each([
        [190, 14],
        [8770, 26.31],
    ])("charges a Pago Móvil of Bs %d the BCV ceiling, Bs %d", (amount, fee) => {
        expect(paidViaCharge("pagoMovil", amount)).toBe(fee);
        expect(paidViaCharge("transfer", amount)).toBe(fee);
    });

    it.each(["sameBankTransfer"] as const)("leaves %s free", (via) => {
        expect(paidViaCharge(via, 8770)).toBeNull();
    });
});

describe("rememberedPaidVia", () => {
    const memory = paidViaMemory([
        { note: "Panadería", paidVia: "pagoMovil" },
        { note: "Farmatodo", paidVia: "card" },
        { note: "Farmatodo", paidVia: "transfer" },
    ]);

    it("keeps how a merchant was last paid", () => {
        expect(rememberedPaidVia(memory, "farmatodo")).toBe("card");
    });

    it("falls back to the latest payment for a new merchant", () => {
        expect(rememberedPaidVia(memory, "Mercal")).toBe("pagoMovil");
    });
});
