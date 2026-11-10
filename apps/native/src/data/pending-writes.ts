import type { Database } from "@/db/client";
import { readNotifications } from "@/lib/notification-read";
import { claimPendingWrites, releasePendingWrites } from "@/lib/widget-bridge";

import { drainPendingWrites } from "./pending-writes-core";

export const drainDevicePendingWrites = (db: Database) =>
    drainPendingWrites(db, claimPendingWrites, releasePendingWrites, readNotifications);
