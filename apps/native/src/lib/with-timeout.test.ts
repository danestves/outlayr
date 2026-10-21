import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import { withTimeout } from "./with-timeout";

describe("withTimeout", () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it("answers the work when it wins, and leaves no timer behind", async () => {
        await expect(withTimeout(Promise.resolve("done"), 5000, "timeout")).resolves.toBe("done");

        expect(jest.getTimerCount()).toBe(0);
    });

    it("answers the sentinel once the window passes", async () => {
        const pending = withTimeout(
            new Promise<string>(() => {
                // Never settles: the timeout is the only way out.
            }),
            5000,
            "timeout"
        );
        jest.advanceTimersByTime(5000);

        await expect(pending).resolves.toBe("timeout");
        expect(jest.getTimerCount()).toBe(0);
    });

    it("clears the timer when the work rejects", async () => {
        await expect(withTimeout(Promise.reject(new Error("nope")), 5000, "timeout")).rejects.toThrow("nope");

        expect(jest.getTimerCount()).toBe(0);
    });
});
