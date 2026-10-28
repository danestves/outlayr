import { describe, expect, it } from "vite-plus/test";

import { debounce } from "./sync-cadence";

const sleep = (ms: number) =>
    new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    });

describe("sync cadence", () => {
    it("collapses a burst into one trailing run", async () => {
        let runs = 0;
        const debounced = debounce(20, () => {
            runs += 1;
        });
        debounced.schedule();
        debounced.schedule();
        debounced.schedule();
        expect(runs).toBe(0);
        await sleep(60);
        expect(runs).toBe(1);
    });

    it("drops a pending run when cancelled", async () => {
        let runs = 0;
        const debounced = debounce(20, () => {
            runs += 1;
        });
        debounced.schedule();
        debounced.cancel();
        await sleep(60);
        expect(runs).toBe(0);
    });

    it("schedules again after it has run", async () => {
        let runs = 0;
        const debounced = debounce(10, () => {
            runs += 1;
        });
        debounced.schedule();
        await sleep(40);
        debounced.schedule();
        await sleep(40);
        expect(runs).toBe(2);
    });
});
