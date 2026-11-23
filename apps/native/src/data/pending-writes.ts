import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";

import type { Database } from "@/db/client";
import { persistDismissal, readDismissals } from "@/lib/dismissed-writes";
import { readNotifications } from "@/lib/notification-read";
import {
    claimPendingWrites,
    claimPendingWritesOrThrow,
    releasePendingWrites,
    releasePendingWritesOrThrow,
} from "@/lib/widget-bridge";

import { dismissPendingWrite, drainPendingWrites } from "./pending-writes-core";

export { closeDrains, reopenDrains } from "./pending-writes-core";

export function dismissDeviceWrite(id: string): void {
    persistDismissal(id);
    dismissPendingWrite(id);
}

const applyDismissals = Effect.gen(function* applyDismissals() {
    for (const id of readDismissals(yield* Clock.currentTimeMillis)) {
        dismissPendingWrite(id);
    }
});

export const drainDevicePendingWrites = Effect.fn("PendingWrites.drainDevicePendingWrites")(function* drainDevice(
    db: Database
) {
    yield* applyDismissals;
    return yield* drainPendingWrites(db, claimPendingWrites, releasePendingWrites, readNotifications);
});

// Leaving a ledger must fail on an unreadable queue, or its captures land in whichever ledger opens next.
export const drainDevicePendingWritesOrFail = Effect.fn("PendingWrites.drainDevicePendingWritesOrFail")(
    function* drainDeviceOrFail(db: Database) {
        yield* applyDismissals;
        return yield* drainPendingWrites(
            db,
            claimPendingWritesOrThrow,
            releasePendingWritesOrThrow,
            readNotifications,
            "own"
        );
    }
);
