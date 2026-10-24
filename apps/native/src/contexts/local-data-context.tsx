import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import type { ReactNode } from "react";
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { bootstrapLocalData } from "@/data/bootstrap";
import { settleLegacyOnboarding } from "@/data/onboarding-core";
import { openDatabase } from "@/db/client";
import type { Database } from "@/db/client";

import migrationsBundle from "../../drizzle/migrations";

export type LocalDataStatus = "opening" | "ready" | "error";

export interface LocalDataContextValue {
    db: Database | null;
    error: Error | null;
    /** Re-runs the whole open, migrate, seed sequence, not just the failed step. */
    retry: () => void;
    status: LocalDataStatus;
}

const LocalDataContext = createContext<LocalDataContextValue | null>(null);

interface LocalDataState {
    db: Database | null;
    error: Error | null;
    status: LocalDataStatus;
}

const OPENING: LocalDataState = { db: null, error: null, status: "opening" };

export function useLocalData(): LocalDataContextValue {
    const value = use(LocalDataContext);
    if (!value) {
        throw new Error("useLocalData must be used within LocalDataProvider");
    }
    return value;
}

// The root layout holds the splash until `ready`, so a throw here means that gate was bypassed.
export function useDatabase(): Database {
    const { db } = useLocalData();
    if (db == null) {
        throw new Error("useDatabase was called outside the root splash gate — the local database is not ready yet");
    }
    return db;
}

async function openLocalData(cancelled: () => boolean): Promise<LocalDataState | null> {
    try {
        const database = openDatabase();
        if (cancelled()) {
            return null;
        }
        await migrate(database, migrationsBundle);
        if (cancelled()) {
            return null;
        }
        await bootstrapLocalData(database);
        if (cancelled()) {
            return null;
        }
        // Ahead of `ready`, so the onboarding guard's first read already sees post-backfill appMeta.
        await settleLegacyOnboarding(database);
        return { db: database, error: null, status: "ready" };
    } catch (caught) {
        return { db: null, error: caught instanceof Error ? caught : new Error(String(caught)), status: "error" };
    }
}

export function LocalDataProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<LocalDataState>(OPENING);
    const { db, error, status } = state;
    const currentRun = useRef(0);

    const open = useCallback(() => {
        currentRun.current += 1;
        const run = currentRun.current;
        const cancelled = () => run !== currentRun.current;
        openLocalData(cancelled).then((opened) => {
            if (opened !== null && !cancelled()) {
                setState(opened);
            }
        });
    }, []);

    useEffect(() => {
        open();
        return () => {
            currentRun.current += 1;
        };
    }, [open]);

    const value = useMemo<LocalDataContextValue>(
        () => ({
            db,
            error,
            retry: () => {
                setState(OPENING);
                open();
            },
            status,
        }),
        [db, status, error, open]
    );

    return <LocalDataContext.Provider value={value}>{children}</LocalDataContext.Provider>;
}
