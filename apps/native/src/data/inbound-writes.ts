import type { InboxRow as InboxRowSchema } from "@outlayr/backend/confect/webhooks.spec";
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";

import type { Database } from "@/db/client";
import type { CloudError } from "@/lib/cloud-error";
import { readPulledInbox, recordPulledInbox } from "@/lib/pulled-inbox";
import type { PendingWrite } from "@/lib/queue-file";
import { adoptPendingWrites } from "@/lib/widget-bridge";

import { drainDevicePendingWrites } from "./pending-writes";
import { isSyncEnabled } from "./sync-outbox-core";

export type InboxRow = typeof InboxRowSchema.Type;

export type InboxId = InboxRow["id"];

export interface InboxTransport {
    ack: (ids: InboxId[]) => Effect.Effect<null, CloudError>;
    inbox: () => Effect.Effect<readonly InboxRow[], CloudError>;
}

/** The prefix is what makes the drain's `alreadyApplied` entry drop a row the server delivered twice. */
export function inboundPendingWrite(row: InboxRow): PendingWrite {
    const { write } = row;
    return {
        amount: write.amount,
        card: write.card ?? null,
        category: write.category ?? null,
        currency: write.currency ?? null,
        date: write.date,
        dedupeKey: write.dedupeKey ?? null,
        id: `inbound:${row.id}`,
        income: write.income,
        note: write.note,
        text: write.text ?? null,
    };
}

/**
 * The queue is written before the ack, so a crash between the two re-delivers a row the id dedupes rather than
 * losing it. A drain that fails leaves the claim file for the next pass.
 */
export const pullInboundWrites = Effect.fn("InboundWrites.pullInboundWrites")(function* pullInboundWrites(
    db: Database,
    transport: InboxTransport
) {
    if (!(yield* isSyncEnabled(db))) {
        return 0;
    }
    const rows = yield* transport.inbox();
    if (rows.length === 0) {
        // A claim left by an earlier failed drain still has to land when nothing new arrives.
        yield* drainDevicePendingWrites(db);
        return 0;
    }
    // A ledger dedupes by write id, so an ack that failed after the park would file the row again in the next ledger.
    const pulled = readPulledInbox(yield* Clock.currentTimeMillis);
    const fresh = rows.filter((row) => !pulled.has(row.id));
    if (fresh.length > 0) {
        if (!adoptPendingWrites(fresh.map(inboundPendingWrite))) {
            return 0;
        }
        recordPulledInbox(fresh.map(({ id }) => id));
    }
    yield* transport.ack(rows.map(({ id }) => id));
    yield* drainDevicePendingWrites(db);
    return fresh.length;
});
