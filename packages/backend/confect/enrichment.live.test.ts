/// <reference types="vite/client" />

import { liveModel } from "@outlayr/ai/testing";
import { route } from "@outlayr/model-router/route";
import * as Effect from "effect/Effect";
import { describe, expect, it } from "vite-plus/test";

import { BACKGROUND_REQUEST_TIMEOUT_MS, runSuggest } from "./enrichment";

const model = await liveModel({ ...route({ feature: "background_suggest" }), model: "standard" });

const LEDGER = ["Personal", "Travel", "Compras", "Café", "Cuidado personal", "Business", "Lavandería", "Gasolina"];

function suggest(name: string) {
    if (model === undefined) {
        throw new Error("no live model");
    }
    return Effect.runPromise(
        runSuggest(model, {
            categoryTree: LEDGER.map((category) => ({ children: [], name: category })),
            currency: "VES",
            income: false,
            locale: "es-VE",
            name,
            regionCode: "VE",
            timeoutMs: BACKGROUND_REQUEST_TIMEOUT_MS,
        })
    );
}

describe.skipIf(model === undefined)("runSuggest against the live model", () => {
    it.each(["Cambio Aceite del Carro", "Servicio de Cambio de Aceite"])(
        "files %s under a new category and group, not the nearest car-related one",
        async (name) => {
            const suggestion = await suggest(name);
            expect(suggestion.categoryName).not.toBe("Gasolina");
            expect(suggestion.isNewCategory).toBeTruthy();
            expect(suggestion.parentCategoryName).not.toBeNull();
        }
    );

    it.each([
        ["Spotify", "Personal"],
        ["Netflix", "Personal"],
        ["McDonald's", "Café"],
        ["Lavado de carro", "Lavandería"],
    ])("files %s under a category that names it, not %s", async (name, wrong) => {
        const suggestion = await suggest(name);
        expect(suggestion.categoryName).not.toBe(wrong);
        expect(suggestion.parentCategoryName).not.toBe(wrong);
        expect(suggestion.isNewCategory).toBeTruthy();
    });
});
