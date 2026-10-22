import type { Database } from "@/db/client";
import { DEFAULT_ACCENT_VALUE } from "@/domain/accent-options";
import { analyticsOnByDefault } from "@/domain/analytics-consent";
import { INSTALLMENT_REMINDERS_DEFAULT } from "@/domain/installment-reminder";
import type { TranslationKey } from "@/i18n/catalog";
import { firstLocale } from "@/i18n/device-language";
import type { Language } from "@/i18n/languages";

import { getMeta, META_KEYS, setMeta } from "./app-meta-core";

export type BoolSettingKey =
    | "showCents"
    | "incomeTracking"
    | "animatedCharts"
    | "showUpcoming"
    | "showUpcomingSoon"
    | "logViewLineGraph"
    | "biometricLock"
    | "shareAnalytics"
    | "showNotifications"
    | "subscriptionReminders"
    | "installmentReminders"
    | "categorySuggestions"
    | "aiConsentV2"
    | "aiConsentPlanScan"
    | "aiEnrichment"
    | "groundedLookup"
    | "hideAmounts"
    | "swapTimeLabel"
    | "confetti"
    | "sentenceCoachSeen"
    | "budgetViewStyle"
    | "use24HourClock";
export type NumberSettingKey =
    | "firstWeekday"
    | "firstDayOfMonth"
    | "numberEntryType"
    | "haptics"
    | "logInsightsTimeFrame"
    | "logInsightsType"
    | "insightsTimeFrame"
    | "insightsMeasure"
    | "accentColor"
    | "colorScheme"
    | "notificationOption"
    | "notificationHour"
    | "notificationMinute";

export const SETTING_DEFAULTS = {
    accentColor: DEFAULT_ACCENT_VALUE,
    aiConsentV2: false,
    aiConsentPlanScan: false,
    aiEnrichment: true,
    animatedCharts: true,
    biometricLock: false,
    budgetViewStyle: true,
    categorySuggestions: true,
    colorScheme: 0,
    confetti: false,
    firstDayOfMonth: 1,
    firstWeekday: 1,
    groundedLookup: true,
    haptics: 1,
    hideAmounts: false,
    incomeTracking: true,
    installmentReminders: INSTALLMENT_REMINDERS_DEFAULT,
    insightsMeasure: 1,
    insightsTimeFrame: 1,
    logInsightsTimeFrame: 2,
    logInsightsType: 1,
    logViewLineGraph: false,
    notificationHour: 8,
    notificationMinute: 0,
    notificationOption: 1,
    numberEntryType: 2,
    sentenceCoachSeen: false,
    shareAnalytics: analyticsOnByDefault(firstLocale()?.regionCode),
    showCents: true,
    showNotifications: false,
    showUpcoming: true,
    showUpcomingSoon: false,
    subscriptionReminders: false,
    swapTimeLabel: false,
    use24HourClock: false,
} as const satisfies Record<BoolSettingKey | NumberSettingKey, boolean | number>;

/** Keys a person chooses, not app bookkeeping. `walletCards` maps each Apple Pay card to an account. */
export const SETTING_KEYS: ReadonlySet<string> = new Set([
    ...Object.keys(SETTING_DEFAULTS),
    META_KEYS.currency,
    META_KEYS.walletCards,
]);

interface ChoiceOption {
    label: TranslationKey;
    value: number;
}

export const HAPTICS_OPTIONS: readonly ChoiceOption[] = [
    {
        label: "settings.haptics.none",
        value: 0,
    },
    {
        label: "settings.haptics.subtle",
        value: 1,
    },
    {
        label: "settings.haptics.excessive",
        value: 2,
    },
];

export const NUMBER_ENTRY_OPTIONS: readonly ChoiceOption[] = [
    {
        label: "settings.numberEntry.type1",
        value: 1,
    },
    {
        label: "settings.numberEntry.type2",
        value: 2,
    },
];

/**
 * No stored row is a question not yet asked, which a parsed bool cannot tell apart from Not now. Nothing reaches
 * Anthropic or ElevenLabs until it is `allowed`.
 */
export type AiConsent = "unanswered" | "allowed" | "declined";
export type AiConsentKey = Extract<BoolSettingKey, "aiConsentV2" | "aiConsentPlanScan">;

export function parseAiConsent(raw: string | null): AiConsent {
    if (raw == null) {
        return "unanswered";
    }
    return parseBoolSetting(raw, false) ? "allowed" : "declined";
}

export function remoteEnrichmentOn(bool: (key: BoolSettingKey) => boolean): boolean {
    return bool("aiConsentV2") && bool("aiEnrichment");
}

export function onOffLabel(value: boolean): TranslationKey {
    return value ? "common.on" : "common.off";
}

export function shownHiddenLabel(value: boolean): TranslationKey {
    return value ? "common.shown" : "common.hidden";
}

export function parseBoolSetting(raw: string | null, fallback: boolean): boolean {
    if (raw == null) {
        return fallback;
    }
    return raw === "true";
}

export function parseIntSetting(raw: string | null, fallback: number): number {
    if (raw == null) {
        return fallback;
    }
    const value = Number.parseInt(raw, 10);
    return Number.isNaN(value) ? fallback : value;
}

export async function readBoolSetting(db: Database, key: BoolSettingKey): Promise<boolean> {
    return parseBoolSetting(await getMeta(db, key), SETTING_DEFAULTS[key]);
}

export async function readNumberSetting(db: Database, key: NumberSettingKey): Promise<number> {
    return parseIntSetting(await getMeta(db, key), SETTING_DEFAULTS[key]);
}

export async function readRemoteEnrichment(db: Database): Promise<boolean> {
    const [consent, enrichment] = await Promise.all([
        readBoolSetting(db, "aiConsentV2"),
        readBoolSetting(db, "aiEnrichment"),
    ]);
    return consent && enrichment;
}

export async function saveAiConsent(db: Database, allowed: boolean): Promise<void> {
    await Promise.all([setBoolSetting(db, "aiConsentV2", allowed), setBoolSetting(db, "aiConsentPlanScan", allowed)]);
}

export async function setBoolSetting(db: Database, key: BoolSettingKey, value: boolean): Promise<void> {
    await setMeta(db, key, value ? "true" : "false");
}

export async function setNumberSetting(db: Database, key: NumberSettingKey, value: number): Promise<void> {
    await setMeta(db, key, String(value));
}

export async function setCurrency(db: Database, code: string): Promise<void> {
    await setMeta(db, META_KEYS.currency, code);
    await setMeta(db, META_KEYS.currencyChosen, "true");
}

export async function seedClockPreference(db: Database, deviceUses24Hour: boolean): Promise<void> {
    if ((await getMeta(db, "use24HourClock")) != null) {
        return;
    }
    await setBoolSetting(db, "use24HourClock", deviceUses24Hour);
}

export function ordinalDay(day: number, language: Language = "en"): string {
    if (language !== "en") {
        return String(day);
    }
    const mod100 = day % 100;
    const mod10 = day % 10;
    let suffix = "th";
    if (mod100 < 11 || mod100 > 13) {
        if (mod10 === 1) {
            suffix = "st";
        } else if (mod10 === 2) {
            suffix = "nd";
        } else if (mod10 === 3) {
            suffix = "rd";
        }
    }
    return `${day}${suffix}`;
}
