import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import { fetchMerchantImage, logoDevUrl } from "./logo-fetch";

const mockWriteCachedLogo = jest.fn();

jest.mock("@/lib/logo-cache", () => ({
    logoCacheKey: () => "test-key",
    readCachedLogo: () => ({ kind: "unknown" }),
    writeCachedLogo: (...args: unknown[]) => mockWriteCachedLogo(...args),
}));

jest.mock<Partial<typeof import("@outlayr/env/native")>>("@outlayr/env/native", () => ({
    env: { EXPO_PUBLIC_LOGO_DEV_TOKEN: "pk_test" },
}));

function png(length = 1024): Uint8Array {
    const bytes = new Uint8Array(length).fill(0x42);
    bytes.set([0x89, 0x50, 0x4e, 0x47], 0);
    return bytes;
}

function imageResponse(status: number, bytes: Uint8Array): Response {
    return {
        arrayBuffer: async () => bytes.buffer,
        headers: { get: () => "image/png" },
        status,
    } as unknown as Response;
}

const notFound = {
    arrayBuffer: async () => new Uint8Array(0).buffer,
    headers: { get: () => "application/json" },
    status: 404,
} as unknown as Response;

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
        const result = await fetchMerchantImage({ domain: "zzqq-nothing.example", name: "zzqq nothing" }, (async (
            url: string
        ) => {
            calls.push(String(url));
            return String(url).includes("img.logo.dev") ? imageResponse(200, branded) : notFound;
        }) as unknown as typeof fetch);

        expect(result).toStrictEqual({ bytes: branded, kind: "logo" });
        expect(calls).toHaveLength(1);
        expect(calls[0]).toContain("img.logo.dev");
    });

    it("falls through to the favicon tier when logo.dev refuses", async () => {
        const favicon = png(1200);
        const calls: string[] = [];
        const result = await fetchMerchantImage({ domain: "zzqq-nothing.example", name: "zzqq nothing" }, (async (
            url: string
        ) => {
            calls.push(String(url));
            return String(url).includes("img.logo.dev") ? notFound : imageResponse(200, favicon);
        }) as unknown as typeof fetch);

        expect(result).toStrictEqual({ bytes: favicon, kind: "logo" });
        expect(calls[0]).toContain("img.logo.dev");
        expect(calls[1]).toContain("s2/favicons");
    });

    it("skips straight to the favicon when no logo.dev token is configured", async () => {
        jest.resetModules();
        jest.doMock<Partial<typeof import("@outlayr/env/native")>>("@outlayr/env/native", () => ({
            env: { EXPO_PUBLIC_LOGO_DEV_TOKEN: undefined },
        }));
        const { fetchMerchantImage: fetchWithNoToken } = require("./logo-fetch") as typeof import("./logo-fetch");

        const favicon = png(1300);
        const calls: string[] = [];
        const result = await fetchWithNoToken({ domain: "zzqq-nothing.example", name: "zzqq nothing" }, (async (
            url: string
        ) => {
            calls.push(String(url));
            return imageResponse(200, favicon);
        }) as unknown as typeof fetch);

        expect(result).toStrictEqual({ bytes: favicon, kind: "logo" });
        expect(calls).toHaveLength(1);
        expect(calls[0]).toContain("s2/favicons");
        jest.dontMock("@outlayr/env/native");
    });

    it("does not remember a miss for a request that queried nothing", async () => {
        mockWriteCachedLogo.mockClear();
        const fetchImpl = jest.fn();

        const outcome = await fetchMerchantImage(
            { domain: null, name: "Netflix" },
            fetchImpl as unknown as typeof fetch
        );

        expect(outcome.kind).toBe("none");
        expect(fetchImpl).not.toHaveBeenCalled();
        expect(mockWriteCachedLogo).not.toHaveBeenCalled();
    });
});

describe("what a miss remembers", () => {
    beforeEach(() => {
        mockWriteCachedLogo.mockClear();
    });

    it("remembers a miss when logo.dev served a placeholder and the favicon was not found", async () => {
        await fetchMerchantImage({ domain: "zzqq-nothing.example", name: "zzqq nothing" }, (async (url: string) =>
            String(url).includes("img.logo.dev")
                ? imageResponse(200, new Uint8Array(16))
                : notFound) as unknown as typeof fetch);
        expect(mockWriteCachedLogo).toHaveBeenCalledWith("test-key", null);
    });

    it("remembers a miss when every tier answered and refused", async () => {
        await fetchMerchantImage(
            { domain: "zzqq-nothing.example", name: "zzqq nothing" },
            (async () => notFound) as unknown as typeof fetch
        );
        expect(mockWriteCachedLogo).toHaveBeenCalledWith("test-key", null);
    });

    it("does not remember a miss for a thrown request", async () => {
        const result = await fetchMerchantImage({ domain: "zinli.com", name: "Zinli" }, (async () => {
            throw new Error("offline");
        }) as unknown as typeof fetch);
        expect(result).toStrictEqual({ kind: "none" });
        expect(mockWriteCachedLogo).not.toHaveBeenCalled();
    });

    it("does not remember a miss for an auth, timeout, rate-limit or server status", async () => {
        for (const status of [401, 403, 408, 429, 503]) {
            // oxlint-disable-next-line no-await-in-loop -- each status is its own request
            await fetchMerchantImage({ domain: "zinli.com", name: "Zinli" }, (async () =>
                imageResponse(status, new Uint8Array(0))) as unknown as typeof fetch);
        }
        expect(mockWriteCachedLogo).not.toHaveBeenCalled();
    });

    it("does not remember a miss when logo.dev refused but the favicon never answered", async () => {
        await fetchMerchantImage({ domain: "zinli.com", name: "Zinli" }, (async (url: string) => {
            if (String(url).includes("img.logo.dev")) {
                return notFound;
            }
            throw new Error("offline");
        }) as unknown as typeof fetch);
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

    function stalled(signal: AbortSignal): Promise<Response> {
        return new Promise((_resolve, reject) => {
            signal.addEventListener("abort", () => reject(new Error("aborted")));
        });
    }

    it("tries logo.dev once more after a timeout, then takes the logo", async () => {
        const branded = png(900);
        let attempts = 0;
        const fetchImpl = async (url: string, init?: RequestInit) => {
            attempts += 1;
            if (attempts === 1) {
                return stalled(init?.signal as AbortSignal);
            }
            return String(url).includes("img.logo.dev") ? imageResponse(200, branded) : notFound;
        };
        const pending = fetchMerchantImage(
            { domain: "zinli.com", name: "Zinli" },
            fetchImpl as unknown as typeof fetch
        );
        await jest.advanceTimersByTimeAsync(3000);
        await expect(pending).resolves.toStrictEqual({ bytes: branded, kind: "logo" });
        expect(attempts).toBe(2);
    });

    it("gives up after the second timeout without remembering a miss", async () => {
        let attempts = 0;
        const fetchImpl = async (_url: string, init?: RequestInit) => {
            attempts += 1;
            return stalled(init?.signal as AbortSignal);
        };
        const pending = fetchMerchantImage(
            { domain: "zinli.com", name: "Zinli" },
            fetchImpl as unknown as typeof fetch
        );
        // Two attempts for logo.dev, two for the favicon.
        await jest.advanceTimersByTimeAsync(3000 * 4);
        await expect(pending).resolves.toStrictEqual({ kind: "none" });
        expect(attempts).toBe(4);
        expect(mockWriteCachedLogo).not.toHaveBeenCalled();
    });
});
