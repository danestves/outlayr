import { useEffect } from "react";
import { AppState } from "react-native";

import type { Database } from "@/db/client";
import { isBehindWatermark } from "@/domain/sync-wakeup";
import { syncTransport, watchSyncWatermark } from "@/lib/convex";
import { debounce } from "@/lib/sync-cadence";

import { subscribeToTableChanges } from "./database-changes";
import { runSync } from "./sync-engine-core";
import { getSyncCursor, isSyncEnabled, outboxPendingCount, SYNCED_TABLES, setSyncedAt } from "./sync-outbox-core";
import { invalidateAll } from "./table-invalidation";

const SYNC_DEBOUNCE_MS = 2000;

/**
 * A peer's push arrives as a live watermark; mount, foreground and local writes cover a dropped socket. Inert
 * until the device-local sync gate is on. `paused` holds every trigger while the outbox keeps queueing.
 */
export function useSyncEngine(db: Database | null, paused: boolean): void {
    useEffect(() => {
        if (db == null || paused) {
            return;
        }
        const transport = syncTransport();

        let running = false;
        let queued = false;

        const cycle = async () => {
            if (running) {
                queued = true;
                return;
            }
            running = true;
            try {
                do {
                    queued = false;
                    // oxlint-disable-next-line no-await-in-loop -- each pass drains the outbox the previous one left behind, so a second push must not start until the first has been acknowledged.
                    const { tables } = await runSync(db, transport);
                    // Outside the write transaction, so nothing repaints rows a rollback is about to remove.
                    invalidateAll(tables);
                } while (queued);
                // Only on a clean pass: a cycle that threw may never have reached the server.
                await setSyncedAt(db, new Date());
            } catch (error) {
                console.warn("[outlayr] sync failed", error);
            } finally {
                running = false;
            }
        };

        const schedule = debounce(SYNC_DEBOUNCE_MS, () => {
            cycle();
        });

        cycle();

        let disposed = false;

        let checkQueued = false;
        const scheduleIfPending = () => {
            if (checkQueued) {
                return;
            }
            checkQueued = true;
            queueMicrotask(() => {
                checkQueued = false;
                if (!disposed) {
                    countPending();
                }
            });
        };

        const countPending = () => {
            outboxPendingCount(db)
                .then((pending) => {
                    if (pending > 0) {
                        schedule.schedule();
                    }
                })
                .catch((error) => {
                    console.warn("[outlayr] sync schedule check failed", error);
                    if (!disposed) {
                        schedule.schedule();
                    }
                });
        };

        const unsubscribeTables = SYNCED_TABLES.map((table) => subscribeToTableChanges(table, scheduleIfPending));

        const subscription = AppState.addEventListener("change", (state) => {
            if (state === "active") {
                cycle();
            } else if (state === "background") {
                schedule.cancel();
            }
        });

        // Read at wake-up: this device's own push moves the watermark too, so a stale cursor would double round trips.
        const wake = async (watermark: number) => {
            if (isBehindWatermark(watermark, await getSyncCursor(db))) {
                await cycle();
            }
        };

        // Open only while the gate is on: a signed-out install must not hold a live subscription to the backend.
        let unwatch: (() => void) | null = null;

        const reconcileWatch = async () => {
            const wanted = await isSyncEnabled(db);
            if (disposed || wanted === (unwatch != null)) {
                return;
            }
            if (wanted) {
                unwatch = watchSyncWatermark((watermark) => {
                    wake(watermark).catch((error) => {
                        console.warn("[outlayr] sync wake-up failed", error);
                    });
                });
                return;
            }
            unwatch?.();
            unwatch = null;
        };

        const watchGate = () => {
            reconcileWatch().catch((error) => {
                console.warn("[outlayr] sync watch reconcile failed", error);
            });
        };

        watchGate();

        // After `watchGate` is declared, or a synchronous callback would hit the temporal dead zone.
        const unsubscribeGate = subscribeToTableChanges("appMeta", watchGate);

        return () => {
            disposed = true;
            schedule.cancel();
            for (const unsubscribe of unsubscribeTables) {
                unsubscribe();
            }
            unsubscribeGate();
            subscription.remove();
            unwatch?.();
        };
    }, [db, paused]);
}
