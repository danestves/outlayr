import { readFile } from "node:fs/promises";

import { createAnthropic } from "@ai-sdk/anthropic";
import { describe, expect, it } from "vite-plus/test";

import { readInstallmentPlan } from "./installmentScan";
import { CLAUDE_MODEL_ID } from "./lib/models";

const PLAN_PATHS = (process.env.INSTALLMENT_PLAN_PATHS ?? "").split(",").filter((path) => path.length > 0);
const live =
    process.env.RUN_LIVE_MODEL_TESTS === "1" && Boolean(process.env.ANTHROPIC_API_KEY) && PLAN_PATHS.length > 0;

describe.skipIf(!live)("installment scan, live", () => {
    it.each(PLAN_PATHS)(
        "%s reads as a Cashea plan of equal cuotas after a paid upfront",
        async (path) => {
            const bytes = await readFile(path);
            const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
            const result = await readInstallmentPlan(
                anthropic(process.env.CLAUDE_MODEL_ID || CLAUDE_MODEL_ID),
                bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
                {
                    accounts: ["Cashea", "Visa"],
                    currency: "USD",
                    language: "es-VE",
                    regionCode: "VE",
                    today: process.env.INSTALLMENT_PLAN_TODAY ?? "2026-10-21",
                }
            );

            console.info(JSON.stringify(result, null, 2));
            expect(result.status).toBe("ok");
            const rows = result.plan?.rows ?? [];
            expect(result.plan?.accountName).toBe("Cashea");
            expect(result.plan?.currency).toBe("USD");
            expect(rows[0]).toMatchObject({ paid: true, sequence: 0 });
            expect(new Set(rows.filter((row) => row.sequence > 0).map((row) => row.amount)).size).toBe(1);
        },
        60_000
    );
});
