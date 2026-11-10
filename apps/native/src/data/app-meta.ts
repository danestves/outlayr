import { eq } from "drizzle-orm";

import type { Database } from "@/db/client";
import { appMeta } from "@/db/schema";

import { Meta } from "./app-meta-core";
import type { MetaName, MetaValue } from "./app-meta-registry";
import { NO_READ, useLiveValue } from "./live-query";

export function useMetaText(db: Database | null, name: MetaName): string | null {
    return useLiveValue(
        appMeta,
        () => (db == null ? NO_READ : db.select({ value: appMeta.value }).from(appMeta).where(eq(appMeta.key, name))),
        (rows: { value: string | null }[]) => rows[0]?.value ?? null,
        [db, name]
    );
}

export function useMeta<K extends MetaName>(db: Database | null, name: K): MetaValue<K> {
    return Meta.decode(name, useMetaText(db, name));
}

// Bootstrap writes the value before the splash lifts, so the default is a type-level guard, not a startup state.
export function useGlobalCurrency(db: Database): string {
    return useMeta(db, "currency");
}
