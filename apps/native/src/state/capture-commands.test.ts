import * as Cause from "effect/Cause";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { CaptureCallError, timedCaptureCommand } from "./capture-commands";

const command = timedCaptureCommand<string>({ operation: "speak", timeout: Duration.seconds(10) });

describe("timedCaptureCommand", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("settles with none once the window passes, and with the answer before it", async () => {
        const registry = AtomRegistry.make();
        const slow = command.run(registry, { call: Effect.never, signal: new AbortController().signal });
        await vi.advanceTimersByTimeAsync(10_000);
        await expect(slow).resolves.toMatchObject({ _tag: "Success", value: Option.none() });

        const quick = command.run(registry, { call: Effect.succeed("done"), signal: new AbortController().signal });
        await vi.advanceTimersByTimeAsync(0);
        await expect(quick).resolves.toMatchObject({ _tag: "Success", value: Option.some("done") });
        registry.dispose();
    });

    it("fails with the typed error when the request rejects", async () => {
        const registry = AtomRegistry.make();
        const pending = command.run(registry, {
            call: Effect.fail(new Error("offline")),
            signal: new AbortController().signal,
        });
        await vi.advanceTimersByTimeAsync(0);

        const result = await pending;
        expect(AsyncResult.isFailure(result) && Cause.squash(result.cause)).toBeInstanceOf(CaptureCallError);
        registry.dispose();
    });

    it("interrupts the request when its signal aborts, without waiting for the window", async () => {
        const registry = AtomRegistry.make();
        const controller = new AbortController();
        const pending = command.run(registry, { call: Effect.never, signal: controller.signal });
        await vi.advanceTimersByTimeAsync(1000);

        controller.abort();
        await vi.advanceTimersByTimeAsync(0);

        const result = await pending;
        expect(AsyncResult.isFailure(result) && Cause.hasInterruptsOnly(result.cause)).toBe(true);
        registry.dispose();
    });

    it("never starts a request whose signal already aborted", async () => {
        const registry = AtomRegistry.make();
        const controller = new AbortController();
        controller.abort();

        const pending = command.run(registry, { call: Effect.never, signal: controller.signal });
        await vi.advanceTimersByTimeAsync(0);

        const result = await pending;
        expect(AsyncResult.isFailure(result) && Cause.hasInterruptsOnly(result.cause)).toBe(true);
        expect(vi.getTimerCount()).toBe(0);
        registry.dispose();
    });
});
