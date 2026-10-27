import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as Effect from "effect/Effect";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import * as Layer from "effect/Layer";

import { fetchMerchantImage, logoDevUrl } from "./logo-fetch";
import type { MerchantImageRequest } from "./logo-fetch";

const mockWriteCachedLogo = jest.fn();

jest.mock("@/lib/logo-cache", () => ({
    logoCacheKey: () => "test-key",
    readCachedLogo: () => ({ kind: "unknown" }),
    writeCachedLogo: (...args: unknown[]) => mockWriteCachedLogo(...args),
}));

jest.mock<Partial<typeof import("@/env")>>("@/env", () => ({
    ENV: { EXPO_PUBLIC_LOGO_DEV_TOKEN: "pk_test" },
}));

function png(length = 1024): Uint8Array<ArrayBuffer> {
    const bytes = new Uint8Array(length).fill(0x42);
    bytes.set([0x89, 0x50, 0x4e, 0x47], 0);
    return bytes;
}

function imageResponse(status: number, bytes: Uint8Array<ArrayBuffer>): Response {
    return new Response(bytes, { headers: { "content-type": "image/png" }, status });
}

function notFound(): Response {
    return new Response(null, { headers: { "content-type": "application/json" }, status: 404 });
}

type Handler = (url: string, init?: RequestInit) => Promise<Response>;

function run(request: MerchantImageRequest, handler: Handler) {
    const http = FetchHttpClient.layer.pipe(
        Layer.provide(Layer.succeed(FetchHttpClient.Fetch, (input, init) => handler(String(input), init)))
    );
    return Effect.runPromise(fetchMerchantImage(request).pipe(Effect.provide(http)));
}

describe("url builders", () => {
    it("asks logo.dev for a 404 rather than its monogram fallback", () => {
        expect(logoDevUrl("netflix.com", "pk_test")).toContain("fallback=404");
        expect(logoDevUrl("netflix.com", "pk_test")).toContain("size=512");
    });
});

describe("fetchMerchantImage", () => {
    it("tries logo.dev before the favicon, with no shared-cache tier ahead of it", async () => {
        const branded = png(900);
        const calls: string[] = [];
        const result = await run({ domain: "zzqq-nothing.example", name: "zzqq nothing" }, async (url) => {
            calls.push(url);
            return url.includes("img.logo.dev") ? imageResponse(200, branded) : notFound();
        });

        expect(result).toStrictEqual({ bytes: branded, kind: "logo" });
        expect(calls).toHaveLength(1);
        expect(calls[0]).toContain("img.logo.dev");
    });

    it("falls through to the favicon tier when logo.dev refuses", async () => {
        const favicon = png(1200);
        const calls: string[] = [];
        const result = await run({ domain: "zzqq-nothing.example", name: "zzqq nothing" }, async (url) => {
            calls.push(url);
            return url.includes("img.logo.dev") ? notFound() : imageResponse(200, favicon);
        });

        expect(result).toStrictEqual({ bytes: favicon, kind: "logo" });
        expect(calls[0]).toContain("img.logo.dev");
        expect(calls[1]).toContain("s2/favicons");
    });

    it("skips straight to the favicon when no logo.dev token is configured", async () => {
        jest.resetModules();
        jest.doMock<Partial<typeof import("@/env")>>("@/env", () => ({
            ENV: { EXPO_PUBLIC_LOGO_DEV_TOKEN: undefined },
        }));
        const { fetchMerchantImage: fetchWithNoToken } = require("./logo-fetch") as typeof import("./logo-fetch");

        const favicon = png(1300);
        const calls: string[] = [];
        const http = FetchHttpClient.layer.pipe(
            Layer.provide(
                Layer.succeed(FetchHttpClient.Fetch, async (input) => {
                    calls.push(String(input));
                    return imageResponse(200, favicon);
                })
            )
        );
        const result = await Effect.runPromise(
            fetchWithNoToken({ domain: "zzqq-nothing.example", name: "zzqq nothing" }).pipe(Effect.provide(http))
        );

        expect(result).toStrictEqual({ bytes: favicon, kind: "logo" });
        expect(calls).toHaveLength(1);
        expect(calls[0]).toContain("s2/favicons");
        jest.dontMock("@/env");
    });

    it("does not remember a miss for a request that queried nothing", async () => {
        mockWriteCachedLogo.mockClear();
        const handler = jest.fn<Handler>();

        const outcome = await run({ domain: null, name: "Netflix" }, handler);

        expect(outcome.kind).toBe("none");
        expect(handler).not.toHaveBeenCalled();
        expect(mockWriteCachedLogo).not.toHaveBeenCalled();
    });
});

describe("what a miss remembers", () => {
    beforeEach(() => {
        mockWriteCachedLogo.mockClear();
    });

    it("remembers a miss when logo.dev served a placeholder and the favicon was not found", async () => {
        await run({ domain: "zzqq-nothing.example", name: "zzqq nothing" }, async (url) =>
            url.includes("img.logo.dev") ? imageResponse(200, new Uint8Array(16)) : notFound()
        );
        expect(mockWriteCachedLogo).toHaveBeenCalledWith("test-key", null);
    });

    it("remembers a miss when every tier answered and refused", async () => {
        await run({ domain: "zzqq-nothing.example", name: "zzqq nothing" }, async () => notFound());
        expect(mockWriteCachedLogo).toHaveBeenCalledWith("test-key", null);
    });

    it("does not remember a miss for a thrown request", async () => {
        const result = await run({ domain: "zinli.com", name: "Zinli" }, async () => {
            throw new Error("offline");
        });
        expect(result).toStrictEqual({ kind: "none" });
        expect(mockWriteCachedLogo).not.toHaveBeenCalled();
    });

    it("does not remember a miss for an auth, timeout, rate-limit or server status", async () => {
        for (const status of [401, 403, 408, 429, 503]) {
            await run({ domain: "zinli.com", name: "Zinli" }, async () => imageResponse(status, new Uint8Array(0)));
        }
        expect(mockWriteCachedLogo).not.toHaveBeenCalled();
    });

    it("does not remember a miss when logo.dev refused but the favicon never answered", async () => {
        await run({ domain: "zinli.com", name: "Zinli" }, async (url) => {
            if (url.includes("img.logo.dev")) {
                return notFound();
            }
            throw new Error("offline");
        });
        expect(mockWriteCachedLogo).not.toHaveBeenCalled();
    });
});

describe("timeouts", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        mockWriteCachedLogo.mockClear();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    function stalled(signal: AbortSignal | null | undefined): Promise<Response> {
        return new Promise((_resolve, reject) => {
            signal?.addEventListener("abort", () => reject(new Error("aborted")));
        });
    }

    it("tries logo.dev once more after a timeout, then takes the logo", async () => {
        const branded = png(900);
        let attempts = 0;
        const pending = run({ domain: "zinli.com", name: "Zinli" }, async (url, init) => {
            attempts += 1;
            if (attempts === 1) {
                return stalled(init?.signal);
            }
            return url.includes("img.logo.dev") ? imageResponse(200, branded) : notFound();
        });
        await jest.runAllTimersAsync();
        await expect(pending).resolves.toStrictEqual({ bytes: branded, kind: "logo" });
        expect(attempts).toBe(2);
    });

    it("gives up after the second timeout without remembering a miss", async () => {
        let attempts = 0;
        const pending = run({ domain: "zinli.com", name: "Zinli" }, async (_url, init) => {
            attempts += 1;
            return stalled(init?.signal);
        });
        await jest.runAllTimersAsync();
        await expect(pending).resolves.toStrictEqual({ kind: "none" });
        expect(attempts).toBe(4);
        expect(mockWriteCachedLogo).not.toHaveBeenCalled();
    });
});
