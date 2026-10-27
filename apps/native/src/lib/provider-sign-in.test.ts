import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as Effect from "effect/Effect";

jest.mock<Partial<typeof import("@react-native-async-storage/async-storage")>>(
    "@react-native-async-storage/async-storage",
    () => require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("@/lib/auth-session", () => ({
    useAuthSession: () => ({ activate: jest.fn(), begin: jest.fn(), reject: jest.fn() }),
}));

const mockSetItemAsync = jest.fn<(key: string, value: string) => Promise<void>>(() => Promise.resolve());

jest.mock("expo-secure-store", () => ({
    setItemAsync: mockSetItemAsync,
}));

beforeEach(() => {
    mockSetItemAsync.mockClear();
});

const { completeAppleSignIn, completeGoogleSignIn, googleProviderSubject, signInWithProvider } =
    require("./provider-sign-in") as typeof import("./provider-sign-in");
const { isSignInCancellation } = require("@/domain/account") as typeof import("@/domain/account");
const { layer } = require("./secure-storage") as typeof import("./secure-storage");

describe("apple-credential-captures-code", () => {
    it("binds raw nonce through Better Auth then grants the captured Apple credential", async () => {
        const client = {
            $fetch: jest.fn(async (_path: string, _init: unknown) => ({ data: { active: true }, error: null })),
            signIn: {
                social: jest.fn(async (_request: unknown) => ({
                    data: { user: { id: "better-auth-user" } },
                    error: null,
                })),
            },
        };
        const activation = { activate: jest.fn(), begin: jest.fn(), reject: jest.fn() };

        await Effect.runPromise(
            completeAppleSignIn(client as never, activation, {
                authorizationCode: "code",
                identityToken: "id-token",
                nonce: "raw-nonce",
                providerSubject: "apple-subject",
            }).pipe(Effect.provide(layer))
        );

        expect(activation.begin).toHaveBeenCalledTimes(1);
        expect(client.signIn.social).toHaveBeenCalledWith({
            idToken: { nonce: "raw-nonce", token: "id-token" },
            provider: "apple",
        });
        expect(client.$fetch).toHaveBeenCalledWith("/apple/grant", {
            body: {
                authorizationCode: "code",
                identityToken: "id-token",
                nonce: "raw-nonce",
                providerSubject: "apple-subject",
            },
            method: "POST",
        });
        expect(activation.activate).toHaveBeenCalledTimes(1);
        expect(activation.reject).not.toHaveBeenCalled();
        expect(mockSetItemAsync).toHaveBeenCalledWith(
            "outlayr.provider-binding",
            JSON.stringify({
                betterAuthUserId: "better-auth-user",
                provider: "apple",
                providerSubject: "apple-subject",
            })
        );
    });

    it("apple-capture-failure-returns-local", async () => {
        const client = {
            $fetch: jest.fn(async () => ({ data: null, error: { message: "grant failed" } })),
            signIn: {
                social: jest.fn(async () => ({ data: { user: { id: "better-auth-user" } }, error: null })),
            },
            signOut: jest.fn(async () => ({ error: null })),
        };
        const activation = { activate: jest.fn(), begin: jest.fn(), reject: jest.fn() };
        const restoreLocal = jest.fn(() => Effect.void);

        const failure = await Effect.runPromise(
            completeAppleSignIn(
                client as never,
                activation,
                {
                    authorizationCode: "code",
                    identityToken: "id-token",
                    nonce: "raw-nonce",
                    providerSubject: "apple-subject",
                },
                restoreLocal
            ).pipe(Effect.provide(layer), Effect.flip)
        );
        expect(failure.cause).toMatchObject({ message: "grant failed" });

        expect(client.signOut).toHaveBeenCalledTimes(1);
        expect(activation.reject).toHaveBeenCalledTimes(1);
        expect(activation.activate).not.toHaveBeenCalled();
        expect(restoreLocal).toHaveBeenCalledTimes(1);
        expect(mockSetItemAsync).not.toHaveBeenCalled();
    });
});

describe("google provider binding", () => {
    it("persists the Better Auth user and validated Google subject after sign-in", async () => {
        const client = {
            signIn: {
                social: jest.fn(async () => ({ data: { user: { id: "better-auth-user" } }, error: null })),
            },
        };
        const identityToken = "header.eyJzdWIiOiJnb29nbGUtc3ViamVjdCJ9.signature";

        await Effect.runPromise(completeGoogleSignIn(client as never, identityToken).pipe(Effect.provide(layer)));

        expect(mockSetItemAsync).toHaveBeenCalledWith(
            "outlayr.provider-binding",
            JSON.stringify({
                betterAuthUserId: "better-auth-user",
                provider: "google",
                providerSubject: "google-subject",
            })
        );
    });

    it("does not persist a binding for rejected or malformed Google sign-ins", async () => {
        const client = {
            signIn: { social: jest.fn(async () => ({ data: null, error: { message: "rejected" } })) },
        };

        const failure = await Effect.runPromise(
            completeGoogleSignIn(client as never, "header.payload.signature").pipe(Effect.provide(layer), Effect.flip)
        );
        expect(failure.cause).toMatchObject({ message: "rejected" });
        expect(mockSetItemAsync).not.toHaveBeenCalled();
        expect(() => googleProviderSubject("header.eyJhdWQiOiJjbGllbnQifQ.signature")).toThrow(
            "Google identity token does not contain a subject"
        );
    });

    it("keeps a cancelled Google picker recognisable as a cancellation", async () => {
        const cancelled = Object.assign(new Error("cancelled"), { code: "SIGN_IN_CANCELLED" });
        const failure = await Effect.runPromise(
            signInWithProvider({
                activation: {} as never,
                client: {} as never,
                request: {
                    getCredential: () => Effect.tryPromise(() => Promise.reject(cancelled)),
                    provider: "google",
                },
            }).pipe(Effect.provide(layer), Effect.flip)
        );
        expect(isSignInCancellation(failure.cause)).toBe(true);
    });
});
