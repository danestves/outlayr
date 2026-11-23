import * as Effect from "effect/Effect";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import type { Database } from "@/db/client";

const state = vi.hoisted(() => ({
    adoptResult: true,
    adopted: [] as string[][],
    drained: 0,
    pulled: new Set<string>(),
    recorded: [] as string[],
    sync: true,
}));

vi.mock("@/lib/pulled-inbox", () => ({
    readPulledInbox: () => new Set(state.pulled),
    recordPulledInbox: (ids: readonly string[]) => {
        state.recorded.push(...ids);
    },
}));
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
    state.pulled = new Set();
    state.recorded = [];
    state.sync = true;
});

describe("pullInboundWrites", () => {
    it("parks only the rows no ledger pulled yet", async () => {
        state.pulled = new Set(["a"]);
        const { acked, transport } = inbox([row("a"), row("b")]);

        const pulled = await Effect.runPromise(pullInboundWrites(db, transport));

        expect(pulled).toBe(1);
        expect(state.adopted).toStrictEqual([["inbound:b"]]);
        expect(state.recorded).toStrictEqual(["b"]);
        expect(acked).toStrictEqual(["a", "b"]);
    });

    it("neither records nor acks when the park fails", async () => {
        state.adoptResult = false;
        const { acked, transport } = inbox([row("a")]);

        const pulled = await Effect.runPromise(pullInboundWrites(db, transport));

        expect(pulled).toBe(0);
        expect(state.recorded).toStrictEqual([]);
        expect(acked).toStrictEqual([]);
        expect(state.drained).toBe(0);
    });
});
