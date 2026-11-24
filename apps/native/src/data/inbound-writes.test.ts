import * as Effect from "effect/Effect";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import type { Database } from "@/db/client";

const state = vi.hoisted(() => ({
    adoptResult: true,
    adopted: [] as string[][],
    drained: 0,
    profile: undefined as string | undefined,
    sync: true,
}));

vi.mock("@/lib/active-profile", () => ({ activeProfileId: () => state.profile }));
vi.mock("@/lib/widget-bridge", () => ({
    adoptPendingWrites: (jobs: { id: string }[]) => {
        state.adopted.push(jobs.map((job) => job.id));
        return state.adoptResult;
    },
}));
vi.mock("./pending-writes", () => ({
    drainDevicePendingWrites: () => {
        state.drained += 1;
        return Effect.void;
    },
}));
vi.mock("./sync-outbox-core", () => ({ isSyncEnabled: () => Effect.succeed(state.sync) }));

import type { InboxRow } from "./inbound-writes";
import { pullInboundWrites } from "./inbound-writes";

const db = {} as Database;

function row(id: string): InboxRow {
    return {
        id: id as InboxRow["id"],
        receivedAt: 1_700_000_000_000,
        write: { amount: 12.4, date: 1_700_000_000_000, income: false, note: "Bakery" },
    };
}

function inbox(rows: readonly InboxRow[]) {
    const acked: string[] = [];
    return {
        acked,
        transport: {
            ack: (ids: InboxRow["id"][]) => {
                acked.push(...ids);
                return Effect.succeed(null);
            },
            inbox: () => Effect.succeed(rows),
        },
    };
}

beforeEach(() => {
    state.adoptResult = true;
    state.adopted = [];
    state.drained = 0;
    state.profile = undefined;
    state.sync = true;
});

describe("pullInboundWrites", () => {
    it("leaves the inbox on the server from a profile, and still drains its device captures", async () => {
        state.profile = "6f1c2b3a-4d5e-4f60-8a7b-9c0d1e2f3a4b";
        const { acked, transport } = inbox([row("a")]);

        const pulled = await Effect.runPromise(pullInboundWrites(db, transport));

        expect(pulled).toBe(0);
        expect(state.adopted).toStrictEqual([]);
        expect(acked).toStrictEqual([]);
        expect(state.drained).toBe(1);
    });

    it("does not ack rows it could not park", async () => {
        state.adoptResult = false;
        const { acked, transport } = inbox([row("a")]);

        const pulled = await Effect.runPromise(pullInboundWrites(db, transport));

        expect(pulled).toBe(0);
        expect(acked).toStrictEqual([]);
        expect(state.drained).toBe(0);
    });
});
