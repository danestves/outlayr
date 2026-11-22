import * as Effect from "effect/Effect";

import type { Database } from "@/db/client";
import { persistDismissal, readDismissals } from "@/lib/dismissed-writes";
import { readNotifications } from "@/lib/notification-read";
import { claimPendingWrites, releasePendingWrites } from "@/lib/widget-bridge";

import { dismissPendingWrite, drainPendingWrites } from "./pending-writes-core";

export function dismissDeviceWrite(id: string): void {
    persistDismissal(id);
    dismissPendingWrite(id);
}

export const drainDevicePendingWrites = (db: Database) =>
    Effect.sync(() => {
        for (const id of readDismissals(Date.now())) {
            dismissPendingWrite(id);
        }
    }).pipe(Effect.andThen(drainPendingWrites(db, claimPendingWrites, releasePendingWrites, readNotifications)));
