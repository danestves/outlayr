import { readFile } from "node:fs/promises";

import { liveModel } from "@outlayr/ai/testing";
import { route } from "@outlayr/model-router/route";
import * as Effect from "effect/Effect";
import { describe, expect, it } from "vite-plus/test";

import { readInstallmentPlan } from "./installmentScan";

const PLAN_PATHS = (process.env.INSTALLMENT_PLAN_PATHS ?? "").split(",").filter((path) => path.length > 0);
const model = PLAN_PATHS.length > 0 ? await liveModel(route({ feature: "installment_scan" })) : undefined;

describe.skipIf(model === undefined)("installment scan, live", () => {
    it.each(PLAN_PATHS)(
        "%s reads as a Cashea plan of equal cuotas after a paid upfront",
        async (path) => {
            if (model === undefined) {
                throw new Error("no live model");
            }
            const bytes = await readFile(path);
            const result = await Effect.runPromise(
                readInstallmentPlan(
                    model,
                    [bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)],
                    {
                        accounts: ["Cashea", "Visa"],
                        currency: "USD",
                        language: "es-VE",
                        regionCode: "VE",
                        today: process.env.INSTALLMENT_PLAN_TODAY ?? "2026-10-21",
                    }
                )
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
