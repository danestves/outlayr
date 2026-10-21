import { describe, expect, it } from "@jest/globals";

import { createDeferredDelete } from "./deferred-delete";
import type { DeferredDeleteSnapshot } from "./deferred-delete";

const WINDOW_MS = 4000;

function fakeClock() {
    let nextHandle = 1;
    let nowMs = 0;
    const scheduled = new Map<number, { run: () => void; at: number }>();

    return {
        elapse(ms: number) {
            nowMs += ms;
            // oxlint-disable-next-line unicorn/no-useless-spread -- the body deletes from `scheduled` as it walks it
            for (const [handle, item] of [...scheduled]) {
                if (item.at <= nowMs) {
                    scheduled.delete(handle);
                    item.run();
                }
            }
        },
        timers: {
            clear: (handle: number) => {
                scheduled.delete(handle);
            },
            set: (run: () => void, ms: number) => {
                const handle = nextHandle;
                nextHandle += 1;
                scheduled.set(handle, { at: nowMs + ms, run });
                return handle;
            },
        },
    };
}

/** A real macrotask, so a rejected commit's handler has certainly run. */
const settle = () =>
    new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
    });

function harness(commit: (id: string) => Promise<void>) {
    const clock = fakeClock();
    const seen: DeferredDeleteSnapshot[] = [];
    const controller = createDeferredDelete({
        commit,
        onChange: (snapshot) => {
            seen.push(snapshot);
        },
        timers: clock.timers,
        windowMs: WINDOW_MS,
    });
    return { clock, controller, seen };
}

function recorder() {
    const committed: string[] = [];
    return {
        commit: (id: string) => {
            committed.push(id);
            return Promise.resolve();
        },
        committed,
    };
}

const rejecting = (): Promise<void> => Promise.reject(new Error("database is locked"));

describe("createDeferredDelete", () => {
    it("hides the row now and holds the write until the window closes", () => {
        const writes = recorder();
        const { clock, controller } = harness(writes.commit);

        controller.requestDelete("a");
        expect(controller.snapshot.pendingId).toBe("a");
        expect(writes.committed).toStrictEqual([]);

        clock.elapse(WINDOW_MS);
        expect(writes.committed).toStrictEqual(["a"]);
        expect(controller.snapshot.pendingId).toBeNull();
    });

    it("drops the write entirely when the delete is taken back", () => {
        const writes = recorder();
        const { clock, controller } = harness(writes.commit);

        controller.requestDelete("a");
        controller.undo();
        clock.elapse(WINDOW_MS * 4);

        expect(writes.committed).toStrictEqual([]);
        expect(controller.snapshot.pendingId).toBeNull();
    });

    it("commits a delete still in its window when a second one starts", () => {
        const writes = recorder();
        const { controller } = harness(writes.commit);

        controller.requestDelete("a");
        controller.requestDelete("b");

        expect(writes.committed).toStrictEqual(["a"]);
        expect(controller.snapshot.pendingId).toBe("b");
    });

    it("leaves the row visible AND reports when the write is rejected", async () => {
        const { clock, controller } = harness(rejecting);

        controller.requestDelete("a");
        clock.elapse(WINDOW_MS);
        await settle();

        expect(controller.snapshot.pendingId).toBeNull();
        expect(controller.snapshot.failedId).toBe("a");
    });

    it("reports nothing when the write lands", async () => {
        const writes = recorder();
        const { clock, controller, seen } = harness(writes.commit);

        controller.requestDelete("a");
        clock.elapse(WINDOW_MS);
        await settle();

        expect(controller.snapshot.failedId).toBeNull();
        expect(seen.every((snapshot) => snapshot.failedId === null)).toBeTruthy();
    });

    it("shows a failure once, then forgets it", async () => {
        const { clock, controller } = harness(rejecting);

        controller.requestDelete("a");
        clock.elapse(WINDOW_MS);
        await settle();
        expect(controller.snapshot.failedId).toBe("a");

        controller.acknowledgeFailure();
        expect(controller.snapshot.failedId).toBeNull();
    });

    it("commits a pending delete exactly once when flushed", () => {
        const writes = recorder();
        const { clock, controller } = harness(writes.commit);

        controller.requestDelete("a");
        controller.flush();
        clock.elapse(WINDOW_MS * 4);

        expect(writes.committed).toStrictEqual(["a"]);
    });

    it("settles a flush only once its write has", async () => {
        let land = () => {};
        const { controller } = harness(
            () =>
                new Promise<void>((resolve) => {
                    land = resolve;
                })
        );
        let settled = false;

        controller.requestDelete("a");
        const flushed = controller.flush().then(() => {
            settled = true;
        });
        await settle();
        expect(settled).toBeFalsy();

        land();
        await flushed;
        expect(settled).toBeTruthy();
    });

    it("still reports a rejected write that was flushed", async () => {
        const { controller, seen } = harness(rejecting);

        controller.requestDelete("a");
        controller.flush();
        await settle();

        expect(controller.snapshot.failedId).toBe("a");
        expect(seen.some((snapshot) => snapshot.failedId === "a")).toBeTruthy();
    });

    it("has nothing to flush once the delete was taken back", () => {
        const writes = recorder();
        const { controller } = harness(writes.commit);

        controller.requestDelete("a");
        controller.undo();
        controller.flush();

        expect(writes.committed).toStrictEqual([]);
    });
});
