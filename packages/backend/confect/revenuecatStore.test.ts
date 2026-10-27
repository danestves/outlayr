import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as TestClock from "effect/testing/TestClock";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { runEdge } from "./lib/runEdge";
import { eraseUpstreamCustomer, RevenueCatError, storeSubscriber } from "./revenuecat";
import { silentHttp, stubHttp } from "./test.helpers";

afterEach(() => {
    vi.restoreAllMocks();
});

describe(eraseUpstreamCustomer, () => {
    it("deletes the encoded subscriber with the secret key, and a customer RevenueCat never saw counts as erased", async () => {
        const http = stubHttp(() => new Response("{}", { status: 404 }));

        await runEdge(eraseUpstreamCustomer("user/1").pipe(Effect.provide(http.layer)));

        expect(http.requests).toHaveLength(1);
        expect(http.requests[0]).toMatchObject({
            method: "DELETE",
            url: "https://api.revenuecat.com/v1/subscribers/user%2F1",
        });
        expect(http.requests[0]?.headers.get("authorization")).toBe("Bearer test-revenuecat-secret-key");
    });

    it("fails on any other refusal so the deletion job stays at purged", async () => {
        const http = stubHttp(() => new Response("{}", { status: 500 }));

        await expect(runEdge(eraseUpstreamCustomer("user-1").pipe(Effect.provide(http.layer)))).rejects.toThrow(
            "RevenueCat customer erase failed with 500"
        );
    });

    it("gives up on a request that never answers", async () => {
        const exit = await Effect.runPromise(
            Effect.gen(function* waitOutTheTimeout() {
                const fiber = yield* Effect.forkChild(Effect.result(eraseUpstreamCustomer("user-1")));
                yield* TestClock.adjust(Duration.seconds(10));
                return yield* Fiber.join(fiber);
            }).pipe(Effect.provide(Layer.mergeAll(silentHttp, TestClock.layer())))
        );

        expect(exit._tag).toBe("Failure");
        expect(exit._tag === "Failure" && exit.failure).toBeInstanceOf(RevenueCatError);
    });
});

describe(storeSubscriber, () => {
    it("answers null without warning when the body is not a subscriber", async () => {
        const warn = vi.spyOn(console, "warn").mockReturnValue(undefined);
        const http = stubHttp(() => Response.json({ subscriber: "nope" }));

        await expect(runEdge(storeSubscriber("user-1").pipe(Effect.provide(http.layer)))).resolves.toBeNull();

        expect(warn).not.toHaveBeenCalled();
    });

    it("answers null and warns when the store's body cannot be read", async () => {
        const warn = vi.spyOn(console, "warn").mockReturnValue(undefined);
        const http = stubHttp(() => new Response("<html>", { status: 200 }));

        await expect(runEdge(storeSubscriber("user-1").pipe(Effect.provide(http.layer)))).resolves.toBeNull();

        expect(warn).toHaveBeenCalledWith("[revenuecat] subscriber read failed", expect.anything());
    });
});
