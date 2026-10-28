import * as Effect from "effect/Effect";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { persistProviderBinding, providerBindingFor } from "./provider-revocation";
import { layer } from "./secure-storage";

const mockSecureStore = vi.hoisted(() => new Map<string, string>());

vi.mock<Partial<typeof import("expo-secure-store")>>(import("expo-secure-store"), () => ({
    deleteItemAsync: async (key: string) => {
        mockSecureStore.delete(key);
    },
    getItemAsync: async (key: string) => mockSecureStore.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => {
        mockSecureStore.set(key, value);
    },
}));

beforeEach(() => {
    mockSecureStore.clear();
});

describe("provider binding", () => {
    it("makes a validated provider sign-in binding available for later deletion", async () => {
        const program = Effect.gen(function* program() {
            yield* persistProviderBinding({
                betterAuthUserId: "better-auth-user",
                provider: "google",
                providerSubject: "google-subject",
            });
            return yield* providerBindingFor("better-auth-user");
        });

        await expect(Effect.runPromise(program.pipe(Effect.provide(layer)))).resolves.toStrictEqual({
            betterAuthUserId: "better-auth-user",
            provider: "google",
            providerSubject: "google-subject",
        });
    });
});
