import * as Effect from "effect/Effect";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import * as Layer from "effect/Layer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { fetchMerchantImage, merchantLogoUrl } from "./logo-fetch";
import type { MerchantImageRequest } from "./logo-fetch";

const cacheMock = vi.hoisted(() => ({
    read: { kind: "unknown" } as { bytes?: Uint8Array; kind: string },
    stale: null as { etag: string | null } | null,
    write: vi.fn(),
}));

vi.mock("@/lib/logo-cache", () => ({
    logoCacheKey: () => "test-key",
    readCachedLogo: () => Effect.succeed(cacheMock.read),
    staleLogo: () => cacheMock.stale,
    writeCachedLogo: (...args: unknown[]) => cacheMock.write(...args),
}));

function png(length = 1024): Uint8Array<ArrayBuffer> {
    const bytes = new Uint8Array(length).fill(0x42);
    bytes.set([0x89, 0x50, 0x4e, 0x47], 0);
    return bytes;
}

function imageResponse(status: number, bytes: Uint8Array<ArrayBuffer>, etag = '"etag"'): Response {
    return new Response(bytes, { headers: { "content-type": "image/png", etag }, status });
}

const notFound = () => new Response(null, { status: 404 });

type Handler = (url: string, init?: RequestInit) => Promise<Response>;

function run(request: MerchantImageRequest, handler: Handler) {
    const http = FetchHttpClient.layer.pipe(
        Layer.provide(Layer.succeed(FetchHttpClient.Fetch, (input, init) => handler(String(input), init)))
    );
    return Effect.runPromise(fetchMerchantImage(request).pipe(Effect.provide(http)));
}

beforeEach(() => {
    cacheMock.read = { kind: "unknown" };
    cacheMock.stale = null;
    cacheMock.write.mockClear();
});

describe("fetchMerchantImage", () => {
    it("asks only our own logo host, so no outside service sees the person's IP", async () => {
        const logo = png(900);
        const calls: string[] = [];
        const result = await run({ domain: "netflix.com", name: "Netflix" }, async (url) => {
            calls.push(url);
            return imageResponse(200, logo, '"abc"');
        });

        expect(result).toStrictEqual({ bytes: logo, kind: "logo" });
        expect(calls).toStrictEqual([merchantLogoUrl("netflix.com")]);
        expect(cacheMock.write).toHaveBeenCalledWith("test-key", logo, '"abc"');
    });

    it("does not remember a miss for a request that queried nothing", async () => {
        const handler = vi.fn<Handler>();
        const outcome = await run({ domain: null, name: "Netflix" }, handler);

        expect(outcome.kind).toBe("none");
        expect(handler).not.toHaveBeenCalled();
        expect(cacheMock.write).not.toHaveBeenCalled();
    });
});

describe("what a miss remembers", () => {
    it("remembers a miss when the Worker has no logo", async () => {
        await run({ domain: "zzqq-nothing.example", name: "zzqq nothing" }, async () => notFound());
        expect(cacheMock.write).toHaveBeenCalledWith("test-key", null);
    });

    it("remembers a miss when a placeholder is served", async () => {
        await run({ domain: "zzqq-nothing.example", name: "zzqq nothing" }, async () =>
            imageResponse(200, new Uint8Array(16))
        );
        expect(cacheMock.write).toHaveBeenCalledWith("test-key", null);
    });

    it("does not remember a miss for a thrown request", async () => {
        const result = await run({ domain: "zinli.com", name: "Zinli" }, async () => {
            throw new Error("offline");
        });
        expect(result).toStrictEqual({ kind: "none" });
        expect(cacheMock.write).not.toHaveBeenCalled();
    });

    it("does not remember a miss while the Worker is still looking or rate limited", async () => {
        for (const status of [401, 403, 408, 429, 503]) {
            await run({ domain: "zinli.com", name: "Zinli" }, async () => imageResponse(status, new Uint8Array(16)));
        }
        expect(cacheMock.write).not.toHaveBeenCalled();
    });
});

describe("a cached logo past its time-to-live", () => {
    const cachedBytes = png(700);

    it("shows the cached file now and stores a newer one for next time", async () => {
        cacheMock.read = { bytes: cachedBytes, kind: "logo" };
        cacheMock.stale = { etag: '"old"' };
        const newer = png(800);
        const seen: (string | null)[] = [];
        const result = await run({ domain: "netflix.com", name: "Netflix" }, async (_url, init) => {
            seen.push(new Headers(init?.headers).get("if-none-match"));
            return imageResponse(200, newer, '"new"');
        });

        expect(result).toStrictEqual({ bytes: cachedBytes, kind: "logo" });
        await vi.waitFor(() => expect(cacheMock.write).toHaveBeenCalledWith("test-key", newer, '"new"'));
        expect(seen).toStrictEqual(['"old"']);
    });

    it("restarts the clock on the same file when nothing changed", async () => {
        cacheMock.read = { bytes: cachedBytes, kind: "logo" };
        cacheMock.stale = { etag: '"same"' };
        await run({ domain: "netflix.com", name: "Netflix" }, async () => new Response(null, { status: 304 }));

        await vi.waitFor(() => expect(cacheMock.write).toHaveBeenCalledWith("test-key", cachedBytes, '"same"'));
    });

    it("sends nothing while the cached logo is fresh", async () => {
        cacheMock.read = { bytes: cachedBytes, kind: "logo" };
        const handler = vi.fn<Handler>();
        await run({ domain: "netflix.com", name: "Netflix" }, handler);
        expect(handler).not.toHaveBeenCalled();
    });
});

describe("timeouts", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    function stalled(signal: AbortSignal | null | undefined): Promise<Response> {
        return new Promise((_resolve, reject) => {
            signal?.addEventListener("abort", () => reject(new Error("aborted")));
        });
    }

    it("tries once more after a timeout, then takes the logo", async () => {
        const logo = png(900);
        let attempts = 0;
        const pending = run({ domain: "zinli.com", name: "Zinli" }, async (_url, init) => {
            attempts += 1;
            return attempts === 1 ? stalled(init?.signal) : imageResponse(200, logo);
        });
        await vi.runAllTimersAsync();
        await expect(pending).resolves.toStrictEqual({ bytes: logo, kind: "logo" });
        expect(attempts).toBe(2);
    });

    it("gives up after the second timeout without remembering a miss", async () => {
        let attempts = 0;
        const pending = run({ domain: "zinli.com", name: "Zinli" }, async (_url, init) => {
            attempts += 1;
            return stalled(init?.signal);
        });
        await vi.runAllTimersAsync();
        await expect(pending).resolves.toStrictEqual({ kind: "none" });
        expect(attempts).toBe(2);
        expect(cacheMock.write).not.toHaveBeenCalled();
    });
});
