import { addDays, startOfDay } from "@outlayr/money/calendar";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";

import { formatSentenceDate } from "@/domain/dates";
import { formatAmount, formatFixed, minorUnitsFor } from "@/domain/money";
import { leadLabelKey } from "@/domain/subscription-reminder";
import type { LeadLabelKey } from "@/domain/subscription-reminder";
import type { TransferRateChoice } from "@/domain/transfer-rate-options";
import type { TranslationKey } from "@/i18n/catalog";
import type { TranslateFn } from "@/i18n/context";
import type { Language } from "@/i18n/languages";

// `recurringType` is a plain column, not a checked union, so an unknown one falls through to the caller's default.
const CADENCE_LABEL_KEY = new Map<number, TranslationKey>([
    [RECURRING_TYPE.daily, "transaction.cadence.daily"],
    [RECURRING_TYPE.weekly, "transaction.cadence.weekly"],
    [RECURRING_TYPE.monthly, "transaction.cadence.monthly"],
    [RECURRING_TYPE.yearly, "transaction.cadence.yearly"],
]);

export function cadenceLabel(t: TranslateFn, type: number): string {
    return t(CADENCE_LABEL_KEY.get(type) ?? "transaction.cadence.monthly");
}

const BCV_CURRENCY = "VES";

export function quotedByBcv(...currencies: readonly string[]): boolean {
    return currencies.includes(BCV_CURRENCY);
}

const RATE_NAME_KEYS = {
    binance: "transaction.rate.binance",
    custom: "transaction.rate.custom",
    eur_reference: "transaction.rate.eur_reference",
    official: "transaction.rate.official",
} as const satisfies Record<TransferRateChoice, TranslationKey>;

const RATE_SOURCE_WORD_KEYS = {
    binance: "transaction.rate.binance",
    custom: "transaction.sentence.rateSource.custom",
    eur_reference: "transaction.sentence.rateSource.eur_reference",
    official: "transaction.sentence.rateSource.official",
} as const satisfies Record<TransferRateChoice, TranslationKey>;

export function rateNameKey(type: TransferRateChoice, bcv: boolean): TranslationKey {
    return bcv && type === "official" ? "transaction.rate.officialBcv" : RATE_NAME_KEYS[type];
}

export function rateSourceWordKey(type: TransferRateChoice, bcv: boolean): TranslationKey {
    return bcv && type === "official" ? "transaction.sentence.rateSource.officialBcv" : RATE_SOURCE_WORD_KEYS[type];
}

const RATE_DELTA_SAME = 0.05;

interface RateDelta {
    bcv: boolean;
    code: string;
    difference: number;
    language: Language;
    percent: number;
}

export function rateDeltaLine(t: TranslateFn, { bcv, code, difference, language, percent }: RateDelta): string {
    const source = t(rateSourceWordKey("official", bcv));
    const line =
        Math.abs(percent) >= RATE_DELTA_SAME
            ? t(percent > 0 ? "transaction.rate.deltaAbove" : "transaction.rate.deltaBelow", {
                  percent: `${formatFixed(Math.abs(percent), 1, language)}%`,
                  source,
              })
            : t("transaction.rate.deltaSame", { source });
    if (Math.abs(difference) < 10 ** -minorUnitsFor(code) / 2) {
        return line;
    }
    const amount = formatAmount(Math.abs(difference), code, true, language);
    return `${line} · ${t(difference > 0 ? "transaction.rate.deltaMore" : "transaction.rate.deltaLess", { amount, source })}`;
}

const NAMED_LIMIT = 28;

export function namedWithCount(names: readonly string[], limit = NAMED_LIMIT): string {
    let shown = 1;
    while (shown < names.length && names.slice(0, shown + 1).join(", ").length <= limit) {
        shown += 1;
    }
    const stated = names.slice(0, shown).join(", ");
    return shown === names.length ? stated : `${stated} +${names.length - shown}`;
}

export function ctaKey(mode: "create" | "edit", isSubscription: boolean): TranslationKey {
    if (mode === "edit") {
        return "transaction.cta.save";
    }
    return isSubscription ? "transaction.cta.addSubscription" : "transaction.cta.add";
}

const LEAD_LABEL_KEY = {
    "settings.notifications.leadDaysBefore": "transaction.remind.daysBefore",
    "settings.notifications.leadOff": "transaction.remind.off",
    "settings.notifications.leadOneDay": "transaction.remind.dayBefore",
    "settings.notifications.leadOneWeek": "transaction.remind.weekBefore",
    "settings.notifications.leadSameDay": "transaction.remind.sameDay",
    "settings.notifications.leadThreeDays": "transaction.remind.daysBefore",
    "settings.notifications.leadTwoDays": "transaction.remind.daysBefore",
} satisfies Record<LeadLabelKey, TranslationKey>;

export function leadLabel(t: TranslateFn, lead: number | null): string {
    // A null lead resolves to `remind.off`, which carries no `{count}`.
    return t(LEAD_LABEL_KEY[leadLabelKey(lead)], { count: lead ?? undefined });
}

interface WhenOptions {
    date: Date;
    interval: string | null;
    language?: Language;
    now: Date;
}

export function transactionWhenLabel(t: TranslateFn, { date, interval, language, now }: WhenOptions): string {
    if (interval !== null) {
        return t("transaction.sentence.when.repeating", { date: formatSentenceDate(date, language), interval });
    }
    const midnight = startOfDay(now).getTime();
    const target = startOfDay(date).getTime();
    if (target === midnight) {
        return t("transaction.sentence.when.today");
    }
    if (target === addDays(new Date(midnight), -1).getTime()) {
        return t("transaction.sentence.when.yesterday");
    }
    return t("transaction.sentence.when.on", { date: formatSentenceDate(date, language) });
}
