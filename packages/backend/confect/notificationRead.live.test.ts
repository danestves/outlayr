/// <reference types="vite/client" />

/** Opt-in (RUN_LIVE_MODEL_TESTS=1, ANTHROPIC_API_KEY): spends tokens. Real pushes the on-device parser misreads. */

import { createAnthropic } from "@ai-sdk/anthropic";
import * as Effect from "effect/Effect";
import { describe, expect, it } from "vite-plus/test";

import { CLAUDE_FAST_MODEL_ID } from "./lib/models";
import { readNotification } from "./notificationRead";

const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
const enabled = process.env.RUN_LIVE_MODEL_TESTS === "1" && apiKey !== "";

const MODEL_ID = process.env.CLAUDE_FAST_MODEL_ID ?? CLAUDE_FAST_MODEL_ID;

const read = (text: string, language?: string) =>
    Effect.runPromise(readNotification(createAnthropic({ apiKey })(MODEL_ID), text, language));

describe.skipIf(!enabled)("notificationRead against the live model", () => {
    it("names the merchant a bank puts before the amount, not the app or the card", async () => {
        const result = await read(
            "Your transaction was successful\nYour SiteGround transaction in the amount of USD 22.99 on Nov 02 2026, 20:44 CST was approved on the card ending with 7909.",
            "en-US"
        );

        expect(result).toStrictEqual({
            read: {
                amount: 22.99,
                currency: "USD",
                debt: null,
                kind: "purchase",
                merchant: expect.stringMatching(/siteground/i),
            },
            status: "ok",
        });
    });

    it("reads a Spanish bank push with a comma decimal", async () => {
        const result = await read(
            "Compra aprobada\nSe realizó un consumo por Bs. 4.150,50 en tu tarjeta terminada en 1234. Comercio: PANADERIA SOL C.A.",
            "es-VE"
        );

        expect(result.read).toMatchObject({ amount: 4150.5, currency: "VES", kind: "purchase" });
        expect(result.read?.merchant).toMatch(/panaderia sol/i);
    });

    it("refuses to log a decline worded without the usual words", async () => {
        const result = await read("Card alert\nA $40.00 charge at Hotel Sol could not be completed.", "en-US");

        expect(result.read?.kind).toBe("declined");
    });

    it("calls a balance reminder that carries an amount other", async () => {
        const result = await read("Statement ready\nYour statement balance is $512.30. Payment due Nov 20.", "en-US");

        expect(result.read?.kind).toBe("other");
    });

    it("reads who owes whom from the person's own words", async () => {
        const owed = await read("Pago Móvil\nJuan Pérez: me debes $30 de la pizza", "es-VE");
        const owing = await read("Splitwise\nMaría López: te debo Bs. 500,00 del mercado", "es-VE");

        expect(owed.read).toMatchObject({ amount: 30, debt: { verb: "borrowed" }, kind: "debt" });
        expect(owing.read).toMatchObject({ amount: 500, debt: { verb: "lent" }, kind: "debt" });
    });

    it("reads a paid cuota with its progress, but leaves a purchase split at checkout a purchase", async () => {
        const cuota = await read("Cashea\nPagaste la cuota 2 de 6 por $15,00", "es-VE");
        const split = await read("Compra aprobada por $90,00 en 3 cuotas sin interés en Falabella", "es-CL");

        expect(cuota.read).toMatchObject({
            amount: 15,
            debt: { installment: { number: 2, of: 6 }, verb: "paidBack" },
            kind: "debt",
        });
        expect(split.read?.kind).toBe("purchase");
    });
});
