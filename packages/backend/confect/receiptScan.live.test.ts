/// <reference types="vite/client" />

// Opt-in: RUN_LIVE_MODEL_TESTS=1 plus the configured provider's key. RECEIPT_PATH is a Spanish
// supermarket ticket printing "TOTAL (EUR) 20,56", seven lines and a Visa payment line.

import { readFile } from "node:fs/promises";

import { liveModel } from "@outlayr/ai/testing";
import { route } from "@outlayr/model-router/route";
import * as Effect from "effect/Effect";
import { describe, expect, it } from "vite-plus/test";

import { readReceipt } from "./receiptScan";

const model = await liveModel(route({ feature: "receipt_scan" }));
const RECEIPT_PATH = process.env.RECEIPT_PATH ?? "/tmp/receipt-eur.jpg";

async function imageBytes(path: string): Promise<ArrayBuffer> {
    const bytes = await readFile(path);
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

describe.skipIf(model === undefined)("receipt scan, live", () => {
    it("a euro supermarket ticket becomes a draft in EUR with its lines", async () => {
        if (model === undefined) {
            throw new Error("no live model");
        }
        const result = await Effect.runPromise(
            readReceipt(model, await imageBytes(RECEIPT_PATH), {
                accounts: ["Visa Sabadell", "Cash"],
                categoryTree: [
                    { children: ["Coffee"], name: "Food" },
                    { children: [], name: "Groceries" },
                ],
                currency: "USD",
                language: "es-ES",
                regionCode: "ES",
                today: "2026-09-05",
            })
        );

        console.info(JSON.stringify(result, null, 2));
        expect(result.status).toBe("ok");
        const { receipt } = result;
        if (receipt === null) {
            throw new Error("no receipt");
        }
        expect(receipt.total).toBeCloseTo(20.56, 2);
        expect(receipt.currency).toBe("EUR");
        expect(receipt.currencySource).toBe("printed");
        expect(receipt.date).toBe("2026-09-04");
        expect(receipt.merchant.toLowerCase()).toContain("mercadona");
        expect(receipt.items.length).toBeGreaterThanOrEqual(5);
        expect(receipt.items.length).toBeLessThanOrEqual(7);
        expect(receipt.categoryName).toBe("Groceries");
        expect(receipt.accountName).toBe("Visa Sabadell");
        expect(receipt.income).toBeFalsy();
    }, 60_000);
});
