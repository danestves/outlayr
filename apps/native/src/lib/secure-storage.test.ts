import { describe, expect, it } from "@jest/globals";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";

import { layer as secureStorageLayer, SecureStorage, SecureStorageError, SecureStoreDriver } from "./secure-storage";

const unavailable = () => Promise.reject(new Error("keychain locked: token=hunter2"));

const failing = secureStorageLayer.pipe(
    Layer.provide(
        Layer.succeed(SecureStoreDriver, { deleteItem: unavailable, getItem: unavailable, setItem: unavailable })
    )
);

describe("secure storage", () => {
    it("reads and writes through the driver", async () => {
        const stored = new Map<string, string>();
        const layer = secureStorageLayer.pipe(
            Layer.provide(
                Layer.succeed(SecureStoreDriver, {
                    deleteItem: async (key) => {
                        stored.delete(key);
                    },
                    getItem: (key) => Promise.resolve(stored.get(key) ?? null),
                    setItem: async (key, value) => {
                        stored.set(key, value);
                    },
                })
            )
        );

        const read = await Effect.runPromise(
            Effect.gen(function* roundTrip() {
                const storage = yield* SecureStorage;
                yield* storage.set("k", "v");
                const written = yield* storage.get("k");
                yield* storage.remove("k");
                return [written, yield* storage.get("k")] as const;
            }).pipe(Effect.provide(layer))
        );

        expect(read).toStrictEqual(["v", null]);
    });

    it("names the operation and key of a failure without leaking the driver's message", async () => {
        const outcomes = await Effect.runPromise(
            SecureStorage.pipe(
                Effect.flatMap((storage) =>
                    Effect.all(
                        [storage.get("a"), storage.set("b", "secret"), storage.remove("c")].map((effect) =>
                            Effect.result(effect)
                        )
                    )
                ),
                Effect.provide(failing)
            )
        );

        const errors = outcomes.map((outcome) => (Result.isFailure(outcome) ? outcome.failure : null));
        expect(errors.every((error) => error instanceof SecureStorageError)).toBe(true);
        expect(errors.map((error) => [error?.operation, error?.key])).toStrictEqual([
            ["read", "a"],
            ["write", "b"],
            ["delete", "c"],
        ]);
        expect(errors[0]?.message).toBe("Secure storage read failed for key a");
    });
});
