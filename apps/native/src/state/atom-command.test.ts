import { describe, expect, it, jest } from "@jest/globals";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as Atom from "effect/reactivity/Atom";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";

import { createCommand, createRuntimeCommand, runAtomCommand } from "./atom-command";

const runtime = Atom.runtime(Layer.empty);

function reporter() {
    return { error: jest.fn(), warn: jest.fn() };
}

describe("atom command", () => {
    it("gives overlapping runs their own result", async () => {
        const registry = AtomRegistry.make();
        const release: Record<string, () => void> = {};
        const gates = Object.fromEntries(
            ["first", "second"].map((name) => [
                name,
                new Promise<void>((resolve) => {
                    release[name] = resolve;
                }),
            ])
        );
        const command = createRuntimeCommand(runtime, {
            execute: (name: string) => Effect.promise(() => gates[name] ?? Promise.resolve()).pipe(Effect.as(name)),
            label: "test:echo",
        });

        const first = command.run(registry, "first");
        const second = command.run(registry, "second");
        release.second?.();
        release.first?.();

        await expect(first).resolves.toMatchObject({ _tag: "Success", value: "first" });
        await expect(second).resolves.toMatchObject({ _tag: "Success", value: "second" });
        registry.dispose();
    });

    it("settles a throw as a defect instead of rejecting", async () => {
        const registry = AtomRegistry.make();
        const command = createRuntimeCommand(runtime, {
            execute: (): Effect.Effect<never> => {
                throw new Error("boom");
            },
            label: "test:throws",
        });

        const result = await command.run(registry, undefined);

        expect(AsyncResult.isFailure(result) && Cause.hasDies(result.cause)).toBe(true);
        registry.dispose();
    });

    it("reports a defect as an error and a typed failure as a warning", async () => {
        const registry = AtomRegistry.make();
        const spy = reporter();
        const defect = createRuntimeCommand(runtime, { execute: () => Effect.die("bug"), label: "test:defect" });
        const failure = createRuntimeCommand(runtime, { execute: () => Effect.fail("nope"), label: "test:failure" });

        await runAtomCommand(registry, defect, undefined, {}, spy);
        await runAtomCommand(registry, failure, undefined, {}, spy);

        expect(spy.error).toHaveBeenCalledTimes(1);
        expect(spy.warn).toHaveBeenCalledTimes(1);
        registry.dispose();
    });

    it("does not report an interrupt", async () => {
        const registry = AtomRegistry.make();
        const spy = reporter();
        const command = createRuntimeCommand(runtime, { execute: () => Effect.interrupt, label: "test:interrupt" });

        const result = await runAtomCommand(registry, command, undefined, {}, spy);

        expect(AsyncResult.isFailure(result)).toBe(true);
        expect(spy.error).not.toHaveBeenCalled();
        expect(spy.warn).not.toHaveBeenCalled();
        registry.dispose();
    });

    it("stays quiet for the kinds a caller switches off", async () => {
        const registry = AtomRegistry.make();
        const spy = reporter();
        const failure = createRuntimeCommand(runtime, { execute: () => Effect.fail("nope"), label: "test:quiet" });

        await runAtomCommand(registry, failure, undefined, { reportFailure: false }, spy);

        expect(spy.warn).not.toHaveBeenCalled();
        registry.dispose();
    });

    it("settles a runtime-free command as a success or a typed failure", async () => {
        const registry = AtomRegistry.make();
        const command = createCommand({
            execute: (input: string) => (input === "ok" ? Effect.succeed(input) : Effect.fail(`bad ${input}`)),
            label: "test:plain",
        });

        await expect(command.run(registry, "ok")).resolves.toMatchObject({ _tag: "Success", value: "ok" });
        const failed = await command.run(registry, "x");

        expect(AsyncResult.isFailure(failed) && Cause.squash(failed.cause)).toBe("bad x");
        registry.dispose();
    });
});
