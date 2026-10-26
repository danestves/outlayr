import { describe, expect, it } from "@jest/globals";

import { retryTokenFetch } from "./token-fetch";

const TOKEN_URL = new URL("https://site.example/api/auth/convex/token");

function failingTimes(failures: number) {
    let calls = 0;
    const fetchImpl = async () => {
        calls += 1;
        if (calls <= failures) {
            throw new TypeError("Network request failed");
        }
        return "answered";
    };
    return { calls: () => calls, fetchImpl };
}

describe("retryTokenFetch", () => {
    it("keeps asking for the Convex token until the network answers", async () => {
        const server = failingTimes(3);
        await expect(retryTokenFetch(server.fetchImpl, [0])(TOKEN_URL)).resolves.toBe("answered");
        expect(server.calls()).toBe(4);
    });

    it("leaves every other auth request to fail at once", async () => {
        const server = failingTimes(1);
        await expect(
            retryTokenFetch(server.fetchImpl, [0])(new URL("https://site.example/api/auth/sign-in/email"))
        ).rejects.toThrow("Network request failed");
        expect(server.calls()).toBe(1);
    });

    it("stops once the request is aborted", async () => {
        const controller = new AbortController();
        controller.abort();
        const server = failingTimes(Number.POSITIVE_INFINITY);
        await expect(retryTokenFetch(server.fetchImpl, [0])(TOKEN_URL, { signal: controller.signal })).rejects.toThrow(
            "Network request failed"
        );
        expect(server.calls()).toBe(1);
    });
});
