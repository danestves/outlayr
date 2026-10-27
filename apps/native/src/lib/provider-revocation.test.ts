import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as Effect from "effect/Effect";

const mockSecureStore = new Map<string, string>();

jest.mock<Partial<typeof import("expo-secure-store")>>("expo-secure-store", () => ({
    getItemAsync: async (key: string) => mockSecureStore.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => {
        mockSecureStore.set(key, value);
    },
}));

const { persistProviderBinding, providerBindingFor } =
    require("./provider-revocation") as typeof import("./provider-revocation");
const { layer } = require("./secure-storage") as typeof import("./secure-storage");

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
