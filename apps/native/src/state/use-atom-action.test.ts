import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { describe, expect, it, vi } from "vite-plus/test";

import { createCommand, SILENT } from "./atom-command";
import { fireAtomCommand } from "./use-atom-action";

const settle = () =>
    new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
    });

describe("fireAtomCommand", () => {
    it("reports a success then settles", async () => {
        const registry = AtomRegistry.make();
        const order: string[] = [];
        const command = createCommand({ execute: (n: number) => Effect.succeed(n * 2), label: "test:double" });

        fireAtomCommand(
            registry,
            command,
            4,
            {
                onFailure: () => order.push("failure"),
                onSettled: () => order.push("settled"),
                onSuccess: (value) => order.push(`success:${value}`),
            },
            SILENT
        );
        await settle();

        expect(order).toStrictEqual(["success:8", "settled"]);
        registry.dispose();
    });

    it("hands a typed failure to onFailure instead of rejecting", async () => {
        const registry = AtomRegistry.make();
        const onFailure = vi.fn<(cause: Cause.Cause<string>) => void>();
        const onSettled = vi.fn();
        const command = createCommand({ execute: () => Effect.fail("nope"), label: "test:fail" });

        fireAtomCommand(registry, command, undefined, { onFailure, onSettled }, SILENT);
        await settle();

        expect(Cause.squash(onFailure.mock.calls[0]?.[0] as Cause.Cause<string>)).toBe("nope");
        expect(onSettled).toHaveBeenCalledOnce();
        registry.dispose();
    });

    it("still settles when a callback throws", async () => {
        const registry = AtomRegistry.make();
        const onSettled = vi.fn();
        const command = createCommand({ execute: () => Effect.succeed(1), label: "test:throwing-callback" });
        const quiet = vi.spyOn(console, "error").mockImplementation(() => {});

        fireAtomCommand(
            registry,
            command,
            undefined,
            {
                onSettled,
                onSuccess: () => {
                    throw new Error("navigate failed");
                },
            },
            SILENT
        );
        await settle();

        expect(onSettled).toHaveBeenCalledOnce();
        quiet.mockRestore();
        registry.dispose();
    });
});
