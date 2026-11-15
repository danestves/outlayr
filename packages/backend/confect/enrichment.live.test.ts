/// <reference types="vite/client" />

import { createAnthropic } from "@ai-sdk/anthropic";
import * as Effect from "effect/Effect";
import { describe, expect, it } from "vite-plus/test";

import { runSuggest } from "./enrichment";
import { CLAUDE_MODEL_ID } from "./lib/models";

const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
const enabled = process.env.RUN_LIVE_MODEL_TESTS === "1" && apiKey !== "";

const MODEL_ID = process.env.CLAUDE_MODEL_ID ?? CLAUDE_MODEL_ID;

const LEDGER = ["Personal", "Travel", "Compras", "Café", "Cuidado personal", "Business", "Lavandería", "Gasolina"];

function suggest(name: string) {
    return Effect.runPromise(
        runSuggest(createAnthropic({ apiKey })(MODEL_ID), {
            categoryTree: LEDGER.map((category) => ({ children: [], name: category })),
            currency: "VES",
            income: false,
            locale: "es-VE",
            name,
            regionCode: "VE",
        })
    );
}

describe.skipIf(!enabled)("runSuggest against the live model", () => {
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
