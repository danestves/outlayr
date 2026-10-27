import { describe, expect, it, jest } from "@jest/globals";
import * as Layer from "effect/Layer";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import * as Result from "effect/Result";

import type { Database } from "@/db/client";
import { appRuntime } from "@/lib/runtime";

jest.mock<Partial<typeof import("./planning-commands")>>("./planning-commands", () => {
    const { die, succeed } = require("effect/Effect") as typeof import("effect/Effect");
    return {
        writeDebt: () => succeed("person-1"),
        writePayoffPlan: () => die(new Error("plan insert threw")),
    };
});

const { saveDebtCommand } = require("./debt-flow-commands") as typeof import("./debt-flow-commands");

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
