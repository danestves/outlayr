import { afterEach, describe, expect, it, jest } from "@jest/globals";

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

    describe("with the clock held", () => {
        afterEach(() => {
            jest.useRealTimers();
        });

        it("waits each delay in turn and keeps the last one", async () => {
            jest.useFakeTimers();
            const server = failingTimes(3);
            const answer = retryTokenFetch(server.fetchImpl, [100, 200])(TOKEN_URL);

            await jest.advanceTimersByTimeAsync(1);
            expect(server.calls()).toBe(1);
            await jest.advanceTimersByTimeAsync(98);
            expect(server.calls()).toBe(1);
            await jest.advanceTimersByTimeAsync(2);
            expect(server.calls()).toBe(2);
            await jest.advanceTimersByTimeAsync(198);
            expect(server.calls()).toBe(2);
            await jest.advanceTimersByTimeAsync(2);
            expect(server.calls()).toBe(3);
            await jest.advanceTimersByTimeAsync(198);
            expect(server.calls()).toBe(3);
            await jest.advanceTimersByTimeAsync(2);

            await expect(answer).resolves.toBe("answered");
            expect(server.calls()).toBe(4);
        });
    });
});
