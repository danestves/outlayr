import * as Effect from "effect/Effect";

import type { Database } from "@/db/client";
import type { TranslationKey } from "@/i18n/catalog";
import type { Language } from "@/i18n/languages";

import { Meta } from "./app-meta-core";

interface ChoiceOption {
    label: TranslationKey;
    value: number;
}

/** `note` says what the selected choice does, under its segmented row. */
interface NotedChoiceOption extends ChoiceOption {
    note: TranslationKey;
}

export const HAPTICS_OPTIONS: readonly NotedChoiceOption[] = [
    {
        label: "settings.haptics.none",
        note: "settings.haptics.noneNote",
        value: 0,
    },
    {
        label: "settings.haptics.subtle",
        note: "settings.haptics.subtleNote",
        value: 1,
    },
    {
        label: "settings.haptics.excessive",
        note: "settings.haptics.excessiveNote",
        value: 2,
    },
];

export const WEEKDAY_OPTIONS: readonly ChoiceOption[] = [
    { label: "settings.time.sunday", value: 1 },
    { label: "settings.time.monday", value: 2 },
];

const LAST_MONTH_START_DAY = 28;

export function monthDayRows(columns: 4 | 7): number[][] {
    return Array.from({ length: LAST_MONTH_START_DAY / columns }, (_row, row) =>
        Array.from({ length: columns }, (_cell, offset) => row * columns + offset + 1)
    );
}

export const NUMBER_ENTRY_OPTIONS: readonly NotedChoiceOption[] = [
    {
        label: "settings.numberEntry.type1",
        note: "settings.numberEntry.type1Note",
        value: 1,
    },
    {
        label: "settings.numberEntry.type2",
        note: "settings.numberEntry.type2Note",
        value: 2,
    },
];

/**
 * No stored row is a question not yet asked, which a parsed bool cannot tell apart from Not now. Nothing reaches
 * Anthropic or ElevenLabs until it is `allowed`.
 */
export type AiConsent = "unanswered" | "allowed" | "declined";
export type AiConsentKey = "aiConsentPlanScan" | "aiConsentV2";

export function aiConsentOf(key: AiConsentKey, raw: string | null): AiConsent {
    if (raw === null) {
        return "unanswered";
    }
    return Meta.decode(key, raw) ? "allowed" : "declined";
}

export function remoteEnrichmentOn(setting: (key: "aiConsentV2" | "aiEnrichment") => boolean): boolean {
    return setting("aiConsentV2") && setting("aiEnrichment");
}

export function onOffLabel(value: boolean): TranslationKey {
    return value ? "common.on" : "common.off";
}

export function shownHiddenLabel(value: boolean): TranslationKey {
    return value ? "common.shown" : "common.hidden";
}

export const readRemoteEnrichment = Effect.fn("Settings.readRemoteEnrichment")(function* readRemoteEnrichment(
    db: Database
) {
    const [consent, enrichment] = yield* Effect.all([Meta.get(db, "aiConsentV2"), Meta.get(db, "aiEnrichment")], {
        concurrency: "unbounded",
    });
    return consent && enrichment;
});

export const saveAiConsent = Effect.fn("Settings.saveAiConsent")(function* saveAiConsent(
    db: Database,
    allowed: boolean
) {
    yield* Effect.all([Meta.set(db, "aiConsentV2", allowed), Meta.set(db, "aiConsentPlanScan", allowed)], {
        concurrency: "unbounded",
    });
});

export const setCurrency = Effect.fn("Settings.setCurrency")(function* setCurrency(db: Database, code: string) {
    yield* Meta.set(db, "currency", code);
    yield* Meta.set(db, "currencyChosen", true);
});

export const seedClockPreference = Effect.fn("Settings.seedClockPreference")(function* seedClockPreference(
    db: Database,
    deviceUses24Hour: boolean
) {
    if (yield* Meta.has(db, "use24HourClock")) {
        return;
    }
    yield* Meta.set(db, "use24HourClock", deviceUses24Hour);
});

export const mirrorTimeZone = Effect.fn("Settings.mirrorTimeZone")(function* mirrorTimeZone(
    db: Database,
    deviceTimeZone: string | null
) {
    if (deviceTimeZone == null || (yield* Meta.get(db, "timeZoneMirrored")) === deviceTimeZone) {
        return;
    }
    yield* Meta.set(db, "timeZone", deviceTimeZone);
    yield* Meta.set(db, "timeZoneMirrored", deviceTimeZone);
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
