import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import * as Result from "effect/Result";
import { describe, expect, it, vi } from "vite-plus/test";

import type { Database } from "@/db/client";
import { appRuntime } from "@/lib/runtime";

import { saveDebtCommand } from "./debt-flow-commands";

vi.mock<Partial<typeof import("./planning-commands")>>(import("./planning-commands"), () => ({
    writeDebt: () => Effect.succeed("person-1"),
    writePayoffPlan: () => Effect.die(new Error("plan insert threw")),
}));

describe("saveDebtCommand", () => {
    it("keeps the saved debt when its payoff plan dies, so a retry cannot write it twice", async () => {
        const registry = AtomRegistry.make({ initialValues: [[appRuntime.layer, Layer.empty]] });

        const result = await saveDebtCommand.run(registry, {
            db: {} as Database,
            debt: {} as never,
            payBackBy: new Date("2026-12-01T00:00:00.000Z"),
        });
        registry.dispose();

        expect(AsyncResult.isSuccess(result)).toBe(true);
        const plan = AsyncResult.isSuccess(result) ? result.value : null;
        expect(plan !== null && Result.isFailure(plan)).toBe(true);
    });
});
