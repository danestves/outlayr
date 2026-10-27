import { beforeEach, describe, expect, it, jest } from "@jest/globals";

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

const { completeAppleSignIn, completeGoogleSignIn, googleProviderSubject } =
    require("./use-provider-sign-in") as typeof import("./use-provider-sign-in");

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

        await expect(
            completeAppleSignIn(client as never, activation, {
                authorizationCode: "code",
                identityToken: "id-token",
                nonce: "raw-nonce",
                providerSubject: "apple-subject",
            })
        ).resolves.toBeUndefined();

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
        const restoreLocal = jest.fn(async () => undefined);

        await expect(
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
            )
        ).rejects.toThrow("grant failed");

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

        await expect(completeGoogleSignIn(client as never, identityToken)).resolves.toBeUndefined();

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

        await expect(completeGoogleSignIn(client as never, "header.payload.signature")).rejects.toThrow("rejected");
        expect(mockSetItemAsync).not.toHaveBeenCalled();
        expect(() => googleProviderSubject("header.eyJhdWQiOiJjbGllbnQifQ.signature")).toThrow(
            "Google identity token does not contain a subject"
        );
    });
});
