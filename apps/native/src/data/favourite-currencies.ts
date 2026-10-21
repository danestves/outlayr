import { eq } from "drizzle-orm";
import { useMemo } from "react";

import type { Database } from "@/db/client";
import { appMeta } from "@/db/schema";
import { parseFavourites } from "@/domain/favourite-currencies";

import { META_KEYS } from "./app-meta-core";
import { useLiveValue } from "./live-query";

// `db` is nullable: the picker is mounted by forms that can sit above the splash gate, where `useDatabase()` throws.
export function useFavouriteCurrencies(db: Database | null): string[] {
    const stored = useLiveValue(
        appMeta,
        () =>
            db === null
                ? { all: (): { value: string | null }[] => [] }
                : db
                      .select({ value: appMeta.value })
                      .from(appMeta)
                      .where(eq(appMeta.key, META_KEYS.favouriteCurrencies)),
        (rows) => rows[0]?.value ?? null,
        [db]
    );
    // Keyed on the stored string so the parsed array keeps its identity, or a memoised picker rebuilds every keystroke.
    return useMemo(() => parseFavourites(stored), [stored]);
}
