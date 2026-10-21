import { getTableName } from "drizzle-orm";
import { addDatabaseChangeListener } from "expo-sqlite";
import { useEffect } from "react";
import { AppState } from "react-native";

import type { Database } from "@/db/client";
import { photoTransport } from "@/lib/convex";
import { photoFiles } from "@/lib/photo-storage";
import { debounce } from "@/lib/sync-cadence";

import { PHOTO_TABLES } from "./photo-store-core";
import { runPhotoSync } from "./photo-sync-core";
import { isSyncEnabled } from "./sync-outbox-core";
import { invalidateAll } from "./table-invalidation";

const PHOTO_TABLE_NAMES = PHOTO_TABLES.map((photoTable) => getTableName(photoTable.table));

const PHOTO_DEBOUNCE_MS = 5000;

/**
 * A separate pass from `runSync`: one round trip per file against another service would otherwise hold up the
 * record stream every screen reads.
 */
export function usePhotoSync(db: Database | null, paused: boolean): void {
    useEffect(() => {
        if (db == null || paused) {
            return;
        }
        const transport = photoTransport();

        let running = false;

        const syncPhotos = async () => {
            try {
                if (!(await isSyncEnabled(db))) {
                    return;
                }
                const { downloaded } = await runPhotoSync(db, photoFiles, transport);
                if (downloaded > 0) {
                    // Only a download changes what a screen can draw.
                    invalidateAll(PHOTO_TABLE_NAMES);
                }
            } catch (error) {
                console.warn("[outlayr] photo sync failed", error);
            }
        };

        const cycle = async () => {
            if (running) {
                return;
            }
            running = true;
            await syncPhotos().finally(() => {
                running = false;
            });
        };

        const schedule = debounce(PHOTO_DEBOUNCE_MS, () => {
            cycle();
        });

        cycle();

        const listener = addDatabaseChangeListener((event) => {
            if (PHOTO_TABLE_NAMES.includes(event.tableName)) {
                schedule.schedule();
            }
        });

        const subscription = AppState.addEventListener("change", (state) => {
            if (state === "active") {
                cycle();
            } else if (state === "background") {
                schedule.cancel();
            }
        });

        return () => {
            schedule.cancel();
            listener.remove();
            subscription.remove();
        };
    }, [db, paused]);
}
