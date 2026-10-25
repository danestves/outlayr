import { eq } from "drizzle-orm";

import { META_KEYS } from "@/data/app-meta-core";
import { useLiveValue } from "@/data/live-query";
import { parseLastWalletEntry, parseNotificationTexts } from "@/data/pending-writes-core";
import type { Database } from "@/db/client";
import { appMeta } from "@/db/schema";

export function useWalletMeta(db: Database) {
    const added = useLiveValue(
        appMeta,
        () => db.select().from(appMeta).where(eq(appMeta.key, META_KEYS.walletShortcutAdded)),
        (rows) => rows[0]?.value === "1"
    );
    const last = useLiveValue(
        appMeta,
        () => db.select().from(appMeta).where(eq(appMeta.key, META_KEYS.lastWalletEntry)),
        (rows) => rows[0]?.value ?? null
    );
    const lastEntry = parseLastWalletEntry(last);
    const lastRunAt = useLiveValue(
        appMeta,
        () => db.select().from(appMeta).where(eq(appMeta.key, META_KEYS.walletLastRunAt)),
        (rows) => (rows[0]?.value ? Number(rows[0].value) : null)
    );
    const lastNotification = useLiveValue(
        appMeta,
        () => db.select().from(appMeta).where(eq(appMeta.key, META_KEYS.notificationTexts)),
        (rows) => parseNotificationTexts(rows[0]?.value).at(-1) ?? null
    );
    const applePayOn = lastRunAt != null || (lastEntry != null && !lastEntry.push);
    return { added, applePayOn, lastEntry, lastNotification, lastRunAt };
}
