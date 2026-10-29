import { eq } from "drizzle-orm";

import type { Database } from "@/db/client";
import { appMeta } from "@/db/schema";
import { monthUsage, parseAutologUsage } from "@/domain/autolog-cap";
import { FREE_AUTOLOG_PER_MONTH } from "@/domain/pro-limits";
import { parseLegacyQueue } from "@/lib/pending-writes-core";

import { META_KEYS } from "./app-meta-core";
import { useLiveValue } from "./live-query";
import { useNow } from "./use-now";

function useMetaText(db: Database, key: string): string | null {
    return useLiveValue(
        appMeta,
        () => db.select().from(appMeta).where(eq(appMeta.key, key)),
        (rows) => rows[0]?.value ?? null,
        [key]
    );
}

export function useAutologUsage(db: Database) {
    const usage = parseAutologUsage(useMetaText(db, META_KEYS.autologUsage));
    const raw = useMetaText(db, META_KEYS.autologWaiting);
    const queued = raw ? parseLegacyQueue(raw) : [];
    return {
        cap: FREE_AUTOLOG_PER_MONTH,
        queued,
        used: monthUsage(usage, useNow()).used,
        waiting: queued.length,
    };
}
