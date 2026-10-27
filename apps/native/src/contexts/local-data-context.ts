import { useAtomValue } from "@effect/atom-react/Hooks";
import { RegistryContext } from "@effect/atom-react/RegistryContext";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as Atom from "effect/reactivity/Atom";
import { use } from "react";

import { LocalDatabase, LocalDatabaseError } from "@/data/local-database";
import type { Database } from "@/db/client";
import { appRuntime } from "@/lib/runtime";

export type LocalDataStatus = "opening" | "ready" | "error";

export interface LocalDataContextValue {
    db: Database | null;
    error: Error | null;
    /** Re-runs the whole open, migrate, seed sequence, not just the failed step. */
    retry: () => void;
    status: LocalDataStatus;
}

export const localDataAtom = appRuntime
    .atom(LocalDatabase.pipe(Effect.flatMap((local) => local.open())))
    .pipe(Atom.keepAlive);

const OPENING = { db: null, error: null, status: "opening" } as const;

export function localDataState(
    result: AsyncResult.AsyncResult<Database, LocalDatabaseError>
): Omit<LocalDataContextValue, "retry"> {
    if (result.waiting || AsyncResult.isInitial(result)) {
        return OPENING;
    }
    if (AsyncResult.isSuccess(result)) {
        return { db: result.value, error: null, status: "ready" };
    }
    const squashed = Cause.squash(result.cause);
    const failure = squashed instanceof LocalDatabaseError ? squashed.cause : squashed;
    return { db: null, error: failure instanceof Error ? failure : new Error(String(failure)), status: "error" };
}

export function useLocalData(): LocalDataContextValue {
    const registry = use(RegistryContext);
    return {
        ...localDataState(useAtomValue(localDataAtom)),
        retry: () => {
            registry.refresh(localDataAtom);
        },
    };
}

// The root layout holds the splash until `ready`, so a throw here means that gate was bypassed.
export function useDatabase(): Database {
    const { db } = useLocalData();
    if (db == null) {
        throw new Error("useDatabase was called outside the root splash gate — the local database is not ready yet");
    }
    return db;
}
