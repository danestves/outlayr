import { describe, expect, it } from "vite-plus/test";

import { escalation, route } from "./route.ts";

const background = (name: string, budget: "open" | "exhausted" = "open") =>
    ({ budget, feature: "background_suggest", name }) as const;

describe("route", () => {
    it("sends an ambiguous transfer name straight to Sonnet in the background, never while typing", () => {
        expect(route(background("Binance P2P"))).toMatchObject({ model: "standard", reason: "transfer_name" });
        expect(route(background("PAGO MOVIL 0102 V12345678"))).toMatchObject({ model: "standard" });
        expect(route({ feature: "category_suggest", name: "Binance P2P" })).toMatchObject({ model: "fast" });
    });

    it("keeps a merchant that only shares a word with a transfer on Haiku", () => {
        expect(route(background("Cambio de aceite del carro"))).toMatchObject({ model: "fast" });
        expect(route(background("TST* SHAKE SHACK 1234"))).toMatchObject({ model: "fast" });
    });

    it("never reaches Sonnet in the background once the budget is exhausted", () => {
        const request = background("Zelle a Maria", "exhausted");
        const first = route(request);
        expect(first).toMatchObject({ model: "fast", reason: "budget_exhausted" });
        expect(escalation(request, first, { isNewCategory: true })).toBeNull();
    });
});

describe("escalation", () => {
    it("retries a new-category background answer on Sonnet", () => {
        const request = background("Torta cumpleaños Ana");
        expect(escalation(request, route(request), { isNewCategory: true })).toMatchObject({
            model: "standard",
            reason: "new_category",
        });
        expect(escalation(request, route(request), { isNewCategory: false })).toBeNull();
    });

    it("never retries while typing or after a Sonnet answer", () => {
        const typing = { feature: "category_suggest", name: "Torta cumpleaños Ana" } as const;
        expect(escalation(typing, route(typing), { isNewCategory: true })).toBeNull();
        const transfer = background("Binance P2P");
        expect(escalation(transfer, route(transfer), { isNewCategory: true })).toBeNull();
    });
});
