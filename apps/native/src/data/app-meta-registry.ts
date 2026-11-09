import * as Schema from "effect/Schema";

import { DEFAULT_ACCENT_VALUE } from "@/domain/accent-options";
import { analyticsOnByDefault } from "@/domain/analytics-consent";
import { INSTALLMENT_REMINDERS_DEFAULT } from "@/domain/installment-reminder";
import {
    AutologAccess,
    AutologUsage,
    BitText,
    BoolText,
    CountText,
    FavouriteCurrenciesText,
    FileImportRecord,
    LastWalletEntry,
    MerchantBook,
    MoneyManagerImportRecord,
    NotificationText,
    NumberText,
    PendingWrite,
    PendingWriteLedgerEntry,
    RepricedSubscription,
    StampedIds,
    WalletCard,
} from "@/domain/meta-values";
import { DEFAULT_CURRENCY } from "@/domain/money";
import { firstLocale } from "@/i18n/device-language";

type SyncScope = "device" | "synced";

type TextCodec = Schema.Codec<unknown, string>;

interface ValueEntry {
    readonly default: unknown;
    readonly schema: TextCodec;
    readonly scope: SyncScope;
}

interface ListEntry {
    readonly elements: Schema.Codec<unknown, unknown>;
    readonly scope: SyncScope;
}

export type MetaEntry = ListEntry | ValueEntry;

type DefaultsFit<R> = {
    readonly [K in keyof R]: R[K] extends { readonly schema: infer S extends TextCodec }
        ? { readonly default: S["Type"] | null }
        : unknown;
};

const defineMeta = <const R extends Readonly<Record<string, MetaEntry>>>(registry: R & DefaultsFit<R>): R => registry;

/** Keys a person chooses, not app bookkeeping. `walletCards` maps each Apple Pay card to an account. */
const SETTINGS = defineMeta({
    accentColor: { default: DEFAULT_ACCENT_VALUE, schema: NumberText, scope: "synced" },
    accountsByHand: { default: false, schema: BoolText, scope: "synced" },
    aiConsentPlanScan: { default: false, schema: BoolText, scope: "device" },
    aiConsentV2: { default: false, schema: BoolText, scope: "device" },
    aiEnrichment: { default: true, schema: BoolText, scope: "synced" },
    animatedCharts: { default: true, schema: BoolText, scope: "synced" },
    // Device-local with `colorScheme` and `numberEntryType`: each suits the device it was chosen on.
    balancesView: { default: 0, schema: NumberText, scope: "device" },
    biometricLock: { default: false, schema: BoolText, scope: "device" },
    budgetViewStyle: { default: true, schema: BoolText, scope: "synced" },
    categorySuggestions: { default: true, schema: BoolText, scope: "synced" },
    colorScheme: { default: 0, schema: NumberText, scope: "device" },
    confetti: { default: false, schema: BoolText, scope: "synced" },
    currency: { default: DEFAULT_CURRENCY, schema: Schema.String, scope: "synced" },
    firstDayOfMonth: { default: 1, schema: NumberText, scope: "synced" },
    firstWeekday: { default: 1, schema: NumberText, scope: "synced" },
    groundedLookup: { default: true, schema: BoolText, scope: "synced" },
    haptics: { default: 1, schema: NumberText, scope: "synced" },
    hideAmounts: { default: false, schema: BoolText, scope: "device" },
    incomeTracking: { default: true, schema: BoolText, scope: "synced" },
    installmentReminders: { default: INSTALLMENT_REMINDERS_DEFAULT, schema: BoolText, scope: "device" },
    insightsMeasure: { default: 1, schema: NumberText, scope: "synced" },
    insightsTimeFrame: { default: 1, schema: NumberText, scope: "synced" },
    logInsightsTimeFrame: { default: 2, schema: NumberText, scope: "synced" },
    logInsightsType: { default: 1, schema: NumberText, scope: "synced" },
    logViewLineGraph: { default: false, schema: BoolText, scope: "synced" },
    notificationHour: { default: 8, schema: NumberText, scope: "device" },
    notificationMinute: { default: 0, schema: NumberText, scope: "device" },
    notificationOption: { default: 1, schema: NumberText, scope: "device" },
    numberEntryType: { default: 2, schema: NumberText, scope: "device" },
    privacyNoticeSeen: { default: 0, schema: NumberText, scope: "device" },
    sentenceCoachSeen: { default: false, schema: BoolText, scope: "device" },
    shareAnalytics: {
        default: analyticsOnByDefault(firstLocale()?.regionCode),
        schema: BoolText,
        scope: "device",
    },
    showCents: { default: true, schema: BoolText, scope: "synced" },
    showNotifications: { default: false, schema: BoolText, scope: "device" },
    showUpcoming: { default: true, schema: BoolText, scope: "synced" },
    showUpcomingSoon: { default: false, schema: BoolText, scope: "synced" },
    subscriptionReminders: { default: false, schema: BoolText, scope: "device" },
    swapTimeLabel: { default: false, schema: BoolText, scope: "synced" },
    termsNoticeSeen: { default: 0, schema: NumberText, scope: "device" },
    use24HourClock: { default: false, schema: BoolText, scope: "synced" },
    walletCards: { elements: WalletCard, scope: "device" },
    yearSheetSeen: { default: 0, schema: NumberText, scope: "device" },
});

const BOOKKEEPING = defineMeta({
    accountDeferred: { default: false, schema: BoolText, scope: "device" },
    autologAccess: { default: "open", schema: AutologAccess, scope: "device" },
    autologUsage: { default: {}, schema: Schema.fromJsonString(AutologUsage), scope: "device" },
    autologWaiting: { elements: PendingWrite, scope: "device" },
    categoryLanguage: { default: null, schema: Schema.String, scope: "device" },
    csvImport: { default: null, schema: Schema.fromJsonString(FileImportRecord), scope: "device" },
    // `bootstrap` seeds `currency` unconditionally, so only this tells a chosen code from the default.
    currencyChosen: { default: false, schema: BoolText, scope: "synced" },
    enrichmentOutbox: { elements: Schema.String, scope: "device" },
    favouriteCurrencies: { default: [], schema: FavouriteCurrenciesText, scope: "device" },
    firstEntryOfferShown: { default: false, schema: BoolText, scope: "device" },
    firstLaunch: { default: false, schema: BoolText, scope: "device" },
    lastRatesPullAt: { default: null, schema: NumberText, scope: "device" },
    lastTransactionAccount: { default: null, schema: Schema.String, scope: "device" },
    lastTransferFeeCategory: { default: null, schema: Schema.String, scope: "device" },
    lastWalletEntry: { default: null, schema: Schema.fromJsonString(LastWalletEntry), scope: "device" },
    // Holds the account subject, not a flag, so signing into a different account asks again.
    ledgerAdoption: { default: null, schema: Schema.String, scope: "device" },
    logoBackfillRetries: { default: {}, schema: Schema.fromJsonString(StampedIds), scope: "device" },
    logoCandidates: { default: {}, schema: Schema.fromJsonString(StampedIds), scope: "device" },
    logoDismissals: { elements: Schema.String, scope: "device" },
    logoPlates: { default: false, schema: BitText, scope: "device" },
    merchantBook: { default: {}, schema: Schema.fromJsonString(MerchantBook), scope: "device" },
    // Device-local: undo must not delete another device's rows.
    moneyManagerImport: {
        default: null,
        schema: Schema.fromJsonString(MoneyManagerImportRecord),
        scope: "device",
    },
    notificationTexts: { elements: NotificationText, scope: "device" },
    // `firstLaunch` cannot stand in: bootstrap writes it before any screen exists.
    onboardingComplete: { default: false, schema: BoolText, scope: "device" },
    onboardingGateMigrated: { default: false, schema: BoolText, scope: "device" },
    pdfImport: { default: null, schema: Schema.fromJsonString(FileImportRecord), scope: "device" },
    // Written in the same SQLite transaction as the row it records, so a replayed queue file never logs twice.
    pendingWriteLedger: { elements: PendingWriteLedgerEntry, scope: "device" },
    recurrenceRepaired: { default: false, schema: BoolText, scope: "device" },
    referralRewardSeen: { default: 0, schema: NumberText, scope: "device" },
    reminderAsked: { default: false, schema: BoolText, scope: "device" },
    reminderChosen: { default: false, schema: BoolText, scope: "device" },
    repricedSubscriptions: { elements: RepricedSubscription, scope: "device" },
    reviewPending: { default: false, schema: BitText, scope: "device" },
    syncAccountSubject: { default: null, schema: Schema.String, scope: "device" },
    // Zero when missing: re-applying a change is a no-op, skipping one is silent data loss.
    syncCursor: { default: 0, schema: CountText, scope: "device" },
    // Breaks same-millisecond write ties, so it must stay device-local or every device gets the same one.
    syncDeviceId: { default: null, schema: Schema.String, scope: "device" },
    // The outbox triggers read it, so a ledger that never syncs never queues a row.
    syncEnabled: { default: false, schema: BitText, scope: "device" },
    // Comma-separated table names; deleted when the re-read completes.
    syncReread: { default: null, schema: Schema.String, scope: "device" },
    syncRestoresReread: { default: false, schema: BitText, scope: "device" },
    syncedAt: { default: null, schema: NumberText, scope: "device" },
    timeZone: { default: null, schema: Schema.String, scope: "synced" },
    timeZoneMirrored: { default: null, schema: Schema.String, scope: "device" },
    // Epoch ms, mirrored from the App Group on foreground.
    walletLastRunAt: { default: null, schema: NumberText, scope: "device" },
    walletShortcutAdded: { default: false, schema: BitText, scope: "device" },
});

/** The property name is the stored `appMeta.key`, so renaming one orphans the row on every install. */
export const META = { ...SETTINGS, ...BOOKKEEPING };

type ValueOf<E> = E extends { readonly elements: infer S extends Schema.Top }
    ? S["Type"][]
    : E extends { readonly default: infer D; readonly schema: infer S extends Schema.Top }
      ? S["Type"] | (D extends null ? null : never)
      : never;

type StoredOf<E> = E extends { readonly elements: infer S extends Schema.Top }
    ? readonly S["Type"][]
    : E extends { readonly schema: infer S extends Schema.Top }
      ? S["Type"]
      : never;

type NamesOf<R, A> = { [K in keyof R]: ValueOf<R[K]> extends A ? K : never }[keyof R];

export type MetaName = keyof typeof META;
export type MetaValue<K extends MetaName> = ValueOf<(typeof META)[K]>;
export type MetaStored<K extends MetaName> = StoredOf<(typeof META)[K]>;

export type SettingName = keyof typeof SETTINGS;
export type BoolSettingKey = NamesOf<typeof SETTINGS, boolean>;
export type NumberSettingKey = NamesOf<typeof SETTINGS, number>;

export const isMetaName = (name: string): name is MetaName => Object.hasOwn(META, name);

// SAFETY: `Object.keys` widens to string; `META` is a literal whose keys are the union.
export const META_NAMES = Object.keys(META) as MetaName[];
// SAFETY: as above, for `SETTINGS`.
export const SETTING_NAMES = Object.keys(SETTINGS) as SettingName[];

/** Allow-list of account-level keys: the outbox triggers and the pull both read it. */
export const SYNCED_META_NAMES: readonly MetaName[] = META_NAMES.filter((name) => META[name].scope === "synced");
