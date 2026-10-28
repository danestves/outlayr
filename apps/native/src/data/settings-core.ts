import * as Effect from "effect/Effect";

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

export const WEEKDAY_OPTIONS: readonly ChoiceOption[] = [
    { label: "settings.time.sunday", value: 1 },
    { label: "settings.time.monday", value: 2 },
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

export const readBoolSetting = Effect.fn("Settings.readBoolSetting")(function* readBoolSetting(
    db: Database,
    key: BoolSettingKey
) {
    return parseBoolSetting(yield* getMeta(db, key), SETTING_DEFAULTS[key]);
});

export const readNumberSetting = Effect.fn("Settings.readNumberSetting")(function* readNumberSetting(
    db: Database,
    key: NumberSettingKey
) {
    return parseIntSetting(yield* getMeta(db, key), SETTING_DEFAULTS[key]);
});

export const readRemoteEnrichment = Effect.fn("Settings.readRemoteEnrichment")(function* readRemoteEnrichment(
    db: Database
) {
    const [consent, enrichment] = yield* Effect.all(
        [readBoolSetting(db, "aiConsentV2"), readBoolSetting(db, "aiEnrichment")],
        { concurrency: "unbounded" }
    );
    return consent && enrichment;
});

export const setBoolSetting = Effect.fn("Settings.setBoolSetting")(function* setBoolSetting(
    db: Database,
    key: BoolSettingKey,
    value: boolean
) {
    yield* setMeta(db, key, value ? "true" : "false");
});

export const setNumberSetting = Effect.fn("Settings.setNumberSetting")(function* setNumberSetting(
    db: Database,
    key: NumberSettingKey,
    value: number
) {
    yield* setMeta(db, key, String(value));
});

export const saveAiConsent = Effect.fn("Settings.saveAiConsent")(function* saveAiConsent(
    db: Database,
    allowed: boolean
) {
    yield* Effect.all([setBoolSetting(db, "aiConsentV2", allowed), setBoolSetting(db, "aiConsentPlanScan", allowed)], {
        concurrency: "unbounded",
    });
});

export const setCurrency = Effect.fn("Settings.setCurrency")(function* setCurrency(db: Database, code: string) {
    yield* setMeta(db, META_KEYS.currency, code);
    yield* setMeta(db, META_KEYS.currencyChosen, "true");
});

export const seedClockPreference = Effect.fn("Settings.seedClockPreference")(function* seedClockPreference(
    db: Database,
    deviceUses24Hour: boolean
) {
    if ((yield* getMeta(db, "use24HourClock")) != null) {
        return;
    }
    yield* setBoolSetting(db, "use24HourClock", deviceUses24Hour);
});

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
