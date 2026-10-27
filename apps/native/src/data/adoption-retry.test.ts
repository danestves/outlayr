import { describe, expect, it, jest } from "@jest/globals";
import * as Effect from "effect/Effect";
import * as Logger from "effect/Logger";

import { createAdoptionSlot, createSingleAdoptionRetry, reconcileOnce } from "./adoption-retry";
import type { AdoptionOutcome } from "./adoption-retry";

describe("adoption retry", () => {
    it("adoption-retries-once", async () => {
        const retry = createSingleAdoptionRetry();
        const run = jest.fn();
        const reconcile = Effect.sync(run);

        retry.schedule();
        await expect(Effect.runPromise(retry.run(reconcile))).resolves.toBe(true);
        retry.schedule();
        await expect(Effect.runPromise(retry.run(reconcile))).resolves.toBe(false);
        expect(run).toHaveBeenCalledTimes(1);
    });

    it("shares one reconcile between overlapping callers and frees the slot after", async () => {
        const slot = createAdoptionSlot("acct-1");
        const run = jest.fn();
        let land: (outcome: AdoptionOutcome) => void = () => undefined;
        const reconcile = Effect.promise(
            () =>
                new Promise<AdoptionOutcome>((resolve) => {
                    run();
                    land = resolve;
                })
        );

        const first = Effect.runPromise(reconcileOnce(slot, reconcile));
        const second = Effect.runPromise(reconcileOnce(slot, reconcile));
        land("ask");

        await expect(first).resolves.toBe("ask");
        await expect(second).resolves.toBe("ask");
        expect(run).toHaveBeenCalledTimes(1);
        expect(slot.inFlight).toBeNull();
    });

    it("settles a failed reconcile and arms the one foreground retry", async () => {
        const slot = createAdoptionSlot("acct-1");
        const retried = jest.fn();

        await expect(
            Effect.runPromise(reconcileOnce(slot, Effect.fail("offline")).pipe(Effect.provide(Logger.layer([]))))
        ).resolves.toBe("settled");
        await expect(Effect.runPromise(slot.retry.run(Effect.sync(retried)))).resolves.toBe(true);
        expect(retried).toHaveBeenCalledTimes(1);
    });
});
