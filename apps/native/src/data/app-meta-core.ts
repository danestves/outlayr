import { eq } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { Database } from "@/db/client";
import { appMeta } from "@/db/schema";

import type { SpendDb } from "./budget-spent";

// Kept apart from `app-meta.ts` so it never value-imports `drizzle-orm/expo-sqlite`, which node tests cannot load.
export const META_KEYS = {
    accountDeferred: "accountDeferred",
    autologAccess: "autologAccess",
    autologUsage: "autologUsage",
    autologWaiting: "autologWaiting",
    categoryLanguage: "categoryLanguage",
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
    /** Device-local: undo must not delete another device's rows. */
    moneyManagerImport: "moneyManagerImport",
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
    timeZone: "timeZone",
    timeZoneMirrored: "timeZoneMirrored",
    walletCards: "walletCards",
    /** Epoch ms, mirrored from the App Group on foreground. */
    walletLastRunAt: "walletLastRunAt",
    walletShortcutAdded: "walletShortcutAdded",
} as const;

export function getMetaSync(db: Database, key: string): string | null {
    const rows = db.select().from(appMeta).where(eq(appMeta.key, key)).limit(1).all();
    return rows[0]?.value ?? null;
}

const AppMetaOperation = Schema.Literals(["get", "set"]);

export class AppMetaError extends Schema.TaggedError<AppMetaError>()("AppMetaError", {
    cause: Schema.Defect(),
    key: Schema.String,
    operation: AppMetaOperation,
}) {
    override get message(): string {
        return `App meta ${this.operation} failed for ${this.key}`;
    }
}

const query = <A>(operation: typeof AppMetaOperation.Type, key: string, run: () => PromiseLike<A>) =>
    Effect.tryPromise({ catch: (cause) => new AppMetaError({ cause, key, operation }), try: run });

export const getMeta = Effect.fn("AppMeta.getMeta")(function* getMeta(db: SpendDb, key: string) {
    const rows = yield* query("get", key, () => db.select().from(appMeta).where(eq(appMeta.key, key)).limit(1));
    return rows[0]?.value ?? null;
});

export const setMeta = Effect.fn("AppMeta.setMeta")(function* setMeta(db: SpendDb, key: string, value: string) {
    yield* query("set", key, () =>
        db.insert(appMeta).values({ key, value }).onConflictDoUpdate({ set: { value }, target: appMeta.key })
    );
});
