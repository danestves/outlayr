import { useEffect, useRef } from "react";
import { AppState } from "react-native";

import type { Database } from "@/db/client";

import { backfillAllRecurring, repairOrphanedRecurrence } from "./recurrence-backfill";

const SWEEP_COOLDOWN_MS = 60_000;

/**
 * At the root because the generated rows feed Budgets and Insights too. `onSwept` runs after the walk commits,
 * even inside the cooldown or after a failure: a reader firing on the same foreground event would race the sweep
 * and see a landing it is about to invalidate.
 */
export function useRecurrenceSweep(db: Database | null, onSwept?: (db: Database) => void): void {
    const lastSweepAt = useRef(0);
    // A ref, so an inline closure does not re-arm the listener; mirrored in an effect, not during render.
    const swept = useRef(onSwept);
    useEffect(() => {
        swept.current = onSwept;
    });

    useEffect(() => {
        if (db == null) {
            return;
        }

        const sweep = () => {
            const startedAt = Date.now();
            if (startedAt - lastSweepAt.current < SWEEP_COOLDOWN_MS) {
                swept.current?.(db);
                return;
            }
            lastSweepAt.current = startedAt;
            // Repair first so a chain reinstated on this launch is swept on it too.
            repairOrphanedRecurrence(db)
                .then(() => backfillAllRecurring(db))
                .then(() => {
                    swept.current?.(db);
                })
                .catch((error) => {
                    lastSweepAt.current = 0;
                    console.error("Recurrence sweep failed", error);
                    swept.current?.(db);
                });
        };

        sweep();

        const subscription = AppState.addEventListener("change", (state) => {
            if (state === "active") {
                sweep();
            }
        });

        return () => {
            subscription.remove();
        };
    }, [db]);
}
