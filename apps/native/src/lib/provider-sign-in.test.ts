import * as Effect from "effect/Effect";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { isSignInCancellation } from "@/domain/account";

import {
    completeAppleSignIn,
    completeGoogleSignIn,
    googleProviderSubject,
    signInWithProvider,
} from "./provider-sign-in";
import { layer } from "./secure-storage";

vi.mock("@react-native-async-storage/async-storage", async () => {
    vi.stubGlobal("jest", vi);
    return import("@react-native-async-storage/async-storage/jest/async-storage-mock");
});

vi.mock("@/lib/auth-session", () => ({
    useAuthSession: () => ({ activate: vi.fn(), begin: vi.fn(), reject: vi.fn() }),
}));

const mockSetItemAsync = vi.hoisted(() =>
    vi.fn<(key: string, value: string) => Promise<void>>(() => Promise.resolve())
);

vi.mock("expo-secure-store", () => ({
    deleteItemAsync: vi.fn(),
    getItemAsync: vi.fn(),
    setItemAsync: mockSetItemAsync,
}));

beforeEach(() => {
    mockSetItemAsync.mockClear();
});

describe("apple-credential-captures-code", () => {
    it("binds raw nonce through Better Auth then grants the captured Apple credential", async () => {
        const client = {
            $fetch: vi.fn(async (_path: string, _init: unknown) => ({ data: { active: true }, error: null })),
            signIn: {
                social: vi.fn(async (_request: unknown) => ({
                    data: { user: { id: "better-auth-user" } },
                    error: null,
                })),
            },
        };
        const activation = { activate: vi.fn(), begin: vi.fn(), reject: vi.fn() };

        await Effect.runPromise(
            completeAppleSignIn(client as never, activation, {
                authorizationCode: "code",
                identityToken: "id-token",
                nonce: "raw-nonce",
                providerSubject: "apple-subject",
            }).pipe(Effect.provide(layer))
        );

        expect(activation.begin).toHaveBeenCalledOnce();
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
        expect(activation.activate).toHaveBeenCalledOnce();
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
            $fetch: vi.fn(async () => ({ data: null, error: { message: "grant failed" } })),
            signIn: {
                social: vi.fn(async () => ({ data: { user: { id: "better-auth-user" } }, error: null })),
            },
            signOut: vi.fn(async () => ({ error: null })),
        };
        const activation = { activate: vi.fn(), begin: vi.fn(), reject: vi.fn() };
        const restoreLocal = vi.fn(() => Effect.void);

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

        expect(client.signOut).toHaveBeenCalledOnce();
        expect(activation.reject).toHaveBeenCalledOnce();
        expect(activation.activate).not.toHaveBeenCalled();
        expect(restoreLocal).toHaveBeenCalledOnce();
        expect(mockSetItemAsync).not.toHaveBeenCalled();
    });
});

describe("google provider binding", () => {
    it("persists the Better Auth user and validated Google subject after sign-in", async () => {
        const client = {
            signIn: {
                social: vi.fn(async () => ({ data: { user: { id: "better-auth-user" } }, error: null })),
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
            signIn: { social: vi.fn(async () => ({ data: null, error: { message: "rejected" } })) },
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
