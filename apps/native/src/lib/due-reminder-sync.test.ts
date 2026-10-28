import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Logger from "effect/Logger";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { unusedDatabase } from "@/db/test-database";

import { DueReminderPasses, DueReminderSync, layer as dueReminderLayer } from "./due-reminder-sync";
import { appRuntime } from "./runtime";

const flush = () => vi.advanceTimersByTimeAsync(0);

describe("due reminder sync", () => {
    let registry: AtomRegistry.AtomRegistry;

    afterEach(() => {
        registry.dispose();
        vi.useRealTimers();
    });

    it("runs whole passes one at a time, re-arming the cuotas even after a failed subscription pass", async () => {
        vi.useFakeTimers();
        const order: string[] = [];
        const held = Promise.withResolvers<undefined>();
        const passes = {
            installment: () =>
                Effect.sync(() => {
                    order.push("installment");
                }),
            subscription: () =>
                Effect.gen(function* subscription() {
                    order.push("subscription");
                    if (order.length === 1) {
                        yield* Effect.promise(() => held.promise);
                        return yield* Effect.fail(new Error("notification queue unavailable"));
                    }
                }),
        };
        const layer = Layer.mergeAll(dueReminderLayer, Logger.layer([]));
        registry = AtomRegistry.make({ initialValues: [[appRuntime.layer, layer]] });
        const db = unusedDatabase();
        registry.mount(
            appRuntime.atom(
                DueReminderSync.pipe(
                    Effect.flatMap((due) =>
                        Effect.all([due.reconcile(db), due.reconcile(db)], { concurrency: "unbounded", discard: true })
                    ),
                    Effect.provideService(DueReminderPasses, passes)
                )
            )
        );

        await flush();
        expect(order).toStrictEqual(["subscription"]);

        held.resolve(undefined);
        await flush();
        expect(order).toStrictEqual(["subscription", "installment", "subscription", "installment"]);
    });
});
