import * as Effect from "effect/Effect";
import { describe, expect, it, vi } from "vite-plus/test";

import { stubHttp } from "../test.helpers";
import {
    appleCredentialLifecycleDependencies,
    grantAppleCredential,
    revokeAppleToken,
    revokeGoogleToken,
} from "./providerLifecycle";
import { runEdge } from "./runEdge";

const input = {
    authorizationCode: "code",
    identityToken: "identity-token",
    nonce: "raw-nonce",
    providerSubject: "apple-subject",
};

const now = new Date("2026-08-11T12:00:00.000Z");

function dependencies() {
    return {
        exchange: vi.fn((_code: string) =>
            Effect.succeed({ accessToken: "access", expiresIn: 3600, idToken: "exchange-id", refreshToken: "refresh" })
        ),
        findAppleAccount: vi.fn((_userId: string) =>
            Effect.succeed<{ accountId: string; id: string; refreshToken?: string } | null>({
                accountId: "apple-subject",
                id: "account-id",
                refreshToken: "encrypted-existing-refresh",
            })
        ),
        persist: vi.fn((..._args: unknown[]): Effect.Effect<void, Error> => Effect.void),
        revoke: vi.fn((_token: string) => Effect.void),
        verify: vi.fn((_token: string, _nonce?: string) => Effect.succeed({ subject: "apple-subject" })),
    };
}

describe("apple-capture-exchange-storage", () => {
    it("stores only server-exchanged provider material and expiry after both subject checks", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(now);
        const deps = dependencies();

        await expect(runEdge(grantAppleCredential("user-id", input, deps))).resolves.toStrictEqual({ active: true });

        expect(deps.verify).toHaveBeenNthCalledWith(1, "identity-token", "raw-nonce");
        expect(deps.exchange).toHaveBeenCalledWith("code");
        expect(deps.verify).toHaveBeenNthCalledWith(2, "exchange-id");
        expect(deps.persist).toHaveBeenCalledWith("account-id", {
            accessToken: "access",
            accessTokenExpiresAt: new Date("2026-08-11T13:00:00.000Z"),
            refreshToken: "refresh",
        });
        vi.useRealTimers();
    });

    it("rejects a linked-subject mismatch and never exchanges or persists", async () => {
        const deps = dependencies();
        deps.findAppleAccount.mockReturnValue(Effect.succeed({ accountId: "other-subject", id: "account-id" }));

        await expect(runEdge(grantAppleCredential("user-id", input, deps))).rejects.toThrow("linked Apple account");

        expect(deps.exchange).not.toHaveBeenCalled();
        expect(deps.persist).not.toHaveBeenCalled();
    });

    it("best-effort revokes exchanged material when persistence fails", async () => {
        const deps = dependencies();
        deps.persist.mockReturnValue(Effect.fail(new Error("storage unavailable")));

        await expect(runEdge(grantAppleCredential("user-id", input, deps))).rejects.toThrow("storage unavailable");

        expect(deps.revoke).toHaveBeenCalledWith("refresh");
    });
});

describe("apple server requests", () => {
    const appleServer = appleCredentialLifecycleDependencies(
        { clientId: "com.tryoutlayr.app", clientSecret: Effect.succeed("signed-secret") },
        { internalAdapter: { findAccounts: () => Promise.resolve([]), updateAccount: () => Promise.resolve() } }
    );
    const tokenResponse = (overrides: Record<string, unknown> = {}) =>
        Response.json({
            access_token: "access",
            expires_in: 3600,
            id_token: "id",
            refresh_token: "refresh",
            ...overrides,
        });

    it("exchanges the code with the client credentials as a form post", async () => {
        const http = stubHttp(() => tokenResponse());

        await expect(
            runEdge(appleServer.exchange("auth-code").pipe(Effect.provide(http.layer)))
        ).resolves.toStrictEqual({ accessToken: "access", expiresIn: 3600, idToken: "id", refreshToken: "refresh" });

        const [request] = http.requests;
        expect(request?.url).toBe("https://appleid.apple.com/auth/token");
        expect(request?.headers.get("content-type")).toBe("application/x-www-form-urlencoded");
        expect(Object.fromEntries(new URLSearchParams(request?.body))).toStrictEqual({
            client_id: "com.tryoutlayr.app",
            client_secret: "signed-secret",
            code: "auth-code",
            grant_type: "authorization_code",
        });
    });

    it("refuses an exchange that returns no refresh token", async () => {
        const http = stubHttp(() => tokenResponse({ refresh_token: undefined }));

        await expect(runEdge(appleServer.exchange("auth-code").pipe(Effect.provide(http.layer)))).rejects.toThrow(
            "returned no refresh token"
        );
    });

    it("refuses an exchange Apple declines", async () => {
        const http = stubHttp(() => new Response("{}", { status: 400 }));

        await expect(runEdge(appleServer.exchange("auth-code").pipe(Effect.provide(http.layer)))).rejects.toThrow(
            "Apple token exchange failed"
        );
    });

    it("fails a revocation Apple declines", async () => {
        const http = stubHttp(() => new Response("{}", { status: 400 }));

        await expect(runEdge(appleServer.revoke("refresh").pipe(Effect.provide(http.layer)))).rejects.toThrow(
            "Apple token cleanup failed"
        );
        expect(Object.fromEntries(new URLSearchParams(http.requests[0]?.body))).toMatchObject({
            token: "refresh",
            token_type_hint: "refresh_token",
        });
    });
});

describe("revoking a stored token", () => {
    const clients = [
        { clientId: "com.tryoutlayr.app", clientSecret: Effect.succeed("bundle-secret") },
        { clientId: "com.tryoutlayr.web", clientSecret: Effect.succeed("web-secret") },
    ];

    it("falls through to the web client when the bundle id did not issue the token", async () => {
        const http = stubHttp((request) =>
            new URLSearchParams(request.body).get("client_id") === "com.tryoutlayr.web"
                ? new Response(null, { status: 200 })
                : Response.json({ error: "invalid_client" }, { status: 400 })
        );

        await runEdge(revokeAppleToken(clients, "refresh").pipe(Effect.provide(http.layer)));

        expect(http.requests).toHaveLength(2);
    });

    it("fails when no client can revoke the token", async () => {
        const http = stubHttp(() => Response.json({ error: "invalid_client" }, { status: 400 }));

        await expect(runEdge(revokeAppleToken(clients, "refresh").pipe(Effect.provide(http.layer)))).rejects.toThrow(
            "Apple token cleanup failed"
        );
    });

    it("treats a Google token that is already dead as revoked, and a Google outage as a failure", async () => {
        const dead = stubHttp(() => Response.json({ error: "invalid_token" }, { status: 400 }));
        await expect(runEdge(revokeGoogleToken("token").pipe(Effect.provide(dead.layer)))).resolves.toBeUndefined();

        const down = stubHttp(() => new Response(null, { status: 503 }));
        await expect(runEdge(revokeGoogleToken("token").pipe(Effect.provide(down.layer)))).rejects.toThrow("503");
    });
});
