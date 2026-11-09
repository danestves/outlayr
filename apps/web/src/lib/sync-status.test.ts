import { expect, test } from "vite-plus/test";

import { advanceSync, INITIAL_SYNC } from "./sync-status";
import type { SyncSnapshot } from "./sync-status";

const state = (over: Partial<Parameters<typeof advanceSync>[1]>) =>
    ({
        connectionRetries: 0,
        hasEverConnected: true,
        hasInflightRequests: false,
        inflightMutations: 0,
        isWebSocketConnected: true,
        ...over,
    }) as Parameters<typeof advanceSync>[1];

test("losing the socket keeps the moment it last was in sync", () => {
    const synced = advanceSync(INITIAL_SYNC, state({}), 100);
    const dropped = advanceSync(synced, state({ isWebSocketConnected: false }), 200);
    const later = advanceSync(dropped, state({ isWebSocketConnected: false }), 900);
    expect(later).toMatchObject({ lastSyncedAt: 200, status: "failed" });
});

test("a first connection that keeps failing is not reported as syncing", () => {
    const retrying = state({ connectionRetries: 2, hasEverConnected: false, isWebSocketConnected: false });
    expect(advanceSync(INITIAL_SYNC, retrying, 100)).toMatchObject({ lastSyncedAt: null, status: "failed" });
});

test("progress counts down from the most changes waiting, then resets", () => {
    let current: SyncSnapshot = INITIAL_SYNC;
    for (const waiting of [38, 14]) {
        current = advanceSync(current, state({ hasInflightRequests: true, inflightMutations: waiting }), 100);
    }
    expect(current).toMatchObject({ peak: 38, status: "syncing", waiting: 14 });
    expect(advanceSync(current, state({}), 200)).toMatchObject({ peak: 0, status: "upToDate", waiting: 0 });
});
