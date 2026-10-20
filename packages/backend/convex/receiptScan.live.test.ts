/// <reference types="vite/client" />

/**
 * The receipt reader against the real Anthropic endpoint. Opt-in for the same
 * reasons as `csvImport.live.test.ts`: it spends money and depends on a network.
 *
 *   RUN_LIVE_MODEL_TESTS=1 \
 *   ANTHROPIC_API_KEY="$(npx convex env get ANTHROPIC_API_KEY)" \
 *   RECEIPT_PATH=/tmp/receipt-eur.jpg \
 *   vp test run convex/receiptScan.live.test.ts
 *
 * The fixture at `RECEIPT_PATH` is a Spanish supermarket ticket in euros with a
 * printed "TOTAL (EUR) 20,56", seven lines and a Visa payment line. The
 * assertions are the contract, not the answer: the total, a currency the ledger
 * does not use, a plausible line count, and only names the caller offered.
 */

import { readFile } from "node:fs/promises";

import { createAnthropic } from "@ai-sdk/anthropic";
import { describe, expect, it } from "vite-plus/test";

import { CLAUDE_MODEL_ID } from "./lib/models";
import { readReceipt } from "./receiptScan";

const live = process.env.RUN_LIVE_MODEL_TESTS === "1" && Boolean(process.env.ANTHROPIC_API_KEY);
const RECEIPT_PATH = process.env.RECEIPT_PATH ?? "/tmp/receipt-eur.jpg";

async function imageBytes(path: string): Promise<ArrayBuffer> {
    const bytes = await readFile(path);
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

describe.skipIf(!live)("receipt scan, live", () => {
    it("a euro supermarket ticket becomes a draft in EUR with its lines", async () => {
        const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const result = await readReceipt(
            anthropic(process.env.CLAUDE_MODEL_ID || CLAUDE_MODEL_ID),
            await imageBytes(RECEIPT_PATH),
            {
                accounts: ["Visa Sabadell", "Cash"],
                categoryTree: [
                    { children: ["Coffee"], name: "Food" },
                    { children: [], name: "Groceries" },
                ],
                currency: "USD",
                language: "es-ES",
                regionCode: "ES",
                today: "2026-09-05",
            }
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
