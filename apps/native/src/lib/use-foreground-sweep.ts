import { useEffect } from "react";
import { AppState } from "react-native";

import type { Database } from "@/db/client";

/**
 * Runs `sweep` once `db` is given and on every return to the foreground. Pass a module-level function: a fresh
 * closure per render would tear the listener down and re-run the pass on every render.
 */
export function useForegroundSweep(db: Database | null, sweep: (db: Database) => Promise<void>, label: string): void {
    useEffect(() => {
        if (db == null) {
            return;
        }

        const run = () => {
            sweep(db).catch((error) => {
                console.error(`${label} failed`, error);
            });
        };

        run();
        const subscription = AppState.addEventListener("change", (state) => {
            if (state === "active") {
                run();
            }
        });

        return () => {
            subscription.remove();
        };
    }, [db, sweep, label]);
}
