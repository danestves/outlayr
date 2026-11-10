import type { Database } from "@/db/client";

import { useMeta } from "./app-meta";

// `db` is nullable: the picker is mounted by forms that can sit above the splash gate, where `useDatabase()` throws.
export function useFavouriteCurrencies(db: Database | null): readonly string[] {
    return useMeta(db, "favouriteCurrencies");
}
