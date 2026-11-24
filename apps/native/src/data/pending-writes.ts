import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";

import type { Database } from "@/db/client";
import { persistDismissal, readDismissals } from "@/lib/dismissed-writes";
import { readNotifications } from "@/lib/notification-read";
import type { ClaimedWrites } from "@/lib/queue-file";
import {
    claimPendingWrites,
    claimPendingWritesOrThrow,
    heldPendingWriteRefs,
    releasePendingWrites,
    releasePendingWritesOrThrow,
} from "@/lib/widget-bridge";

import {
    dismissPendingWrite,
    drainPendingWrites,
    isDismissedWrite,
    restoreDismissedPurchase,
} from "./pending-writes-core";

export { acquireDrains, closeDrains, reopenDrains } from "./pending-writes-core";

export function dismissDeviceWrite(id: string): void {
    persistDismissal(id, dismissPendingWrite(id) ?? undefined);
}

// One append per capture a session: a dismissal persisted with only its id gains the key at release, the last point
// the claim still knows it.
const persistedPurchases = new Set<string>();

function persistDismissedPurchases(claimed: ClaimedWrites): void {
    for (const job of claimed.jobs) {
        const key = job.dedupeKey?.trim();
        if (!key || !isDismissedWrite(job.id)) {
            continue;
        }
        const marker = `${job.id}\u0000${key}`;
        if (!persistedPurchases.has(marker)) {
            persistedPurchases.add(marker);
            persistDismissal(job.id, { date: job.date, key });
        }
        // A settlement with this key later in the session must skip too, not only after a relaunch.
        restoreDismissedPurchase(key, job.date);
    }
}

const releaseDrainedWrites = (claimed: ClaimedWrites) => {
    persistDismissedPurchases(claimed);
    releasePendingWrites(claimed);
};

const releaseDrainedWritesOrThrow = (claimed: ClaimedWrites) => {
    persistDismissedPurchases(claimed);
    releasePendingWritesOrThrow(claimed);
};

const applyDismissals = Effect.gen(function* applyDismissals() {
    for (const { date, id, key } of readDismissals(yield* Clock.currentTimeMillis, heldPendingWriteRefs())) {
        dismissPendingWrite(id);
        if (key !== undefined && date !== undefined) {
            restoreDismissedPurchase(key, date);
        }
    }
});

export const drainDevicePendingWrites = Effect.fn("PendingWrites.drainDevicePendingWrites")(function* drainDevice(
    db: Database
) {
    yield* applyDismissals;
    return yield* drainPendingWrites(db, claimPendingWrites, releaseDrainedWrites, readNotifications);
});

// Leaving a ledger must fail on an unreadable queue, or its captures land in whichever ledger opens next.
export const drainDevicePendingWritesOrFail = Effect.fn("PendingWrites.drainDevicePendingWritesOrFail")(
    function* drainDeviceOrFail(db: Database) {
        yield* applyDismissals;
        return yield* drainPendingWrites(
            db,
            claimPendingWritesOrThrow,
            releaseDrainedWritesOrThrow,
            readNotifications,
            "own"
        );
    }
);
