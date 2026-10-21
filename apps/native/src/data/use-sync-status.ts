import { count } from "drizzle-orm";

import type { Database } from "@/db/client";
import { appMeta, outbox } from "@/db/schema";

import { META_KEYS } from "./app-meta-core";
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
    const metaRows = useLiveQuery(appMeta, () => db.select().from(appMeta));

    const raw = metaRows.find((row) => row.key === META_KEYS.syncedAt)?.value;
    const ms = raw == null ? Number.NaN : Number(raw);

    return {
        enabled: metaRows.find((row) => row.key === META_KEYS.syncEnabled)?.value === "1",
        pending: pendingRows[0]?.total ?? 0,
        syncedAt: Number.isFinite(ms) ? new Date(ms) : null,
    };
}
