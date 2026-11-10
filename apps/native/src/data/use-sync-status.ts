import { count } from "drizzle-orm";

import type { Database } from "@/db/client";
import { outbox } from "@/db/schema";

import { useMeta } from "./app-meta";
import { useLiveQuery } from "./live-query";

export interface SyncStatus {
    /** The device-local switch, which outlives any entitlement. */
    enabled: boolean;
    pending: number;
    syncedAt: Date | null;
}

/**
 * No error state by design (`docs/internals/convex-sync.md` §8.7): a stalled queue shows as a pending count that
 * stops falling.
 */
export function useSyncStatus(db: Database): SyncStatus {
    const pendingRows = useLiveQuery(outbox, () => db.select({ total: count() }).from(outbox));
    const enabled = useMeta(db, "syncEnabled");
    const syncedAt = useMeta(db, "syncedAt");

    return {
        enabled,
        pending: pendingRows[0]?.total ?? 0,
        syncedAt: syncedAt === null ? null : new Date(syncedAt),
    };
}
