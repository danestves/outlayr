import { eq } from "drizzle-orm";

import type { Database } from "@/db/client";
import { appMeta } from "@/db/schema";
import { DEFAULT_CURRENCY } from "@/domain/money";

import { META_KEYS } from "./app-meta-core";
import { useLiveValue } from "./live-query";

// Bootstrap writes the value before the splash lifts, so the USD fallback is a type-level guard, not a startup state.
export function useGlobalCurrency(db: Database): string {
    return useLiveValue(
        appMeta,
        () => db.select().from(appMeta).where(eq(appMeta.key, META_KEYS.currency)),
        (rows) => rows[0]?.value ?? DEFAULT_CURRENCY
    );
}
