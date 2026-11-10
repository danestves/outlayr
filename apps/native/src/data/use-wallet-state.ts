import { useMeta } from "@/data/app-meta";
import type { Database } from "@/db/client";

export function useWalletState(db: Database) {
    const added = useMeta(db, "walletShortcutAdded");
    const lastEntry = useMeta(db, "lastWalletEntry");
    const lastRunAt = useMeta(db, "walletLastRunAt");
    const lastNotification = useMeta(db, "notificationTexts").at(-1) ?? null;
    const applePayOn = lastRunAt != null || (lastEntry != null && !lastEntry.push);
    return { added, applePayOn, lastEntry, lastNotification, lastRunAt };
}
