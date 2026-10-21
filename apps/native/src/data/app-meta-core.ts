import { eq } from "drizzle-orm";

import type { Database } from "@/db/client";
import { appMeta } from "@/db/schema";

import type { SpendDb } from "./budget-spent";

// Kept apart from `app-meta.ts` so it never value-imports `drizzle-orm/expo-sqlite`, which node tests cannot load.
export const META_KEYS = {
    accountDeferred: "accountDeferred",
    currency: "currency",
    /** `bootstrap` seeds `currency` unconditionally, so only this tells a chosen code from the default. */
    currencyChosen: "currencyChosen",
    enrichmentOutbox: "enrichmentOutbox",
    favouriteCurrencies: "favouriteCurrencies",
    firstLaunch: "firstLaunch",
    lastTransactionAccount: "lastTransactionAccount",
    lastTransferFeeCategory: "lastTransferFeeCategory",
    lastWalletEntry: "lastWalletEntry",
    notificationTexts: "notificationTexts",
    /** Holds the account subject, not a flag, so signing into a different account asks again. */
    ledgerAdoption: "ledgerAdoption",
    logoBackfillRetries: "logoBackfillRetries",
    logoCandidates: "logoCandidates",
    logoDismissals: "logoDismissals",
    logoPlates: "logoPlates",
    merchantBook: "merchantBook",
    /** `firstLaunch` cannot stand in: bootstrap writes it before any screen exists. */
    onboardingComplete: "onboardingComplete",
    onboardingGateMigrated: "onboardingGateMigrated",
    /** Written in the same SQLite transaction as the row it records, so a replayed queue file never logs twice. */
    pendingWriteLedger: "pendingWriteLedger",
    repricedSubscriptions: "repricedSubscriptions",
    recurrenceRepaired: "recurrenceRepaired",
    reminderAsked: "reminderAsked",
    reminderChosen: "reminderChosen",
    syncAccountSubject: "syncAccountSubject",
    syncCursor: "syncCursor",
    syncRestoresReread: "syncRestoresReread",
    /** Breaks same-millisecond write ties, so it must stay device-local or every device gets the same one. */
    syncDeviceId: "syncDeviceId",
    /** Comma-separated table names; deleted when the re-read completes. */
    syncReread: "syncReread",
    /** The outbox triggers read it, so a ledger that never syncs never queues a row. */
    syncEnabled: "syncEnabled",
    syncedAt: "syncedAt",
    walletCards: "walletCards",
    /** Epoch ms, mirrored from the App Group on foreground. */
    walletLastRunAt: "walletLastRunAt",
    walletShortcutAdded: "walletShortcutAdded",
} as const;

export function getMetaSync(db: Database, key: string): string | null {
    const rows = db.select().from(appMeta).where(eq(appMeta.key, key)).limit(1).all();
    return rows[0]?.value ?? null;
}

export async function getMeta(db: SpendDb, key: string): Promise<string | null> {
    const rows = await db.select().from(appMeta).where(eq(appMeta.key, key)).limit(1);
    return rows[0]?.value ?? null;
}

export async function setMeta(db: SpendDb, key: string, value: string): Promise<void> {
    await db.insert(appMeta).values({ key, value }).onConflictDoUpdate({ set: { value }, target: appMeta.key });
}
