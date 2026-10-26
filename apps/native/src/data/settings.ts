import { useAtomMount } from "@effect/atom-react/Hooks";
import { eq, inArray } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Atom from "effect/reactivity/Atom";
import { useCalendars } from "expo-localization";

import type { Database } from "@/db/client";
import { appMeta } from "@/db/schema";

import { useLiveValue } from "./live-query";
import type { SyncQuery } from "./live-query";
import {
    parseAiConsent,
    parseBoolSetting,
    parseIntSetting,
    SETTING_DEFAULTS,
    seedClockPreference,
} from "./settings-core";
import type { AiConsent, AiConsentKey, BoolSettingKey, NumberSettingKey } from "./settings-core";

export interface SettingsSnapshot {
    bool: (key: BoolSettingKey) => boolean;
    number: (key: NumberSettingKey) => number;
}

type MetaRow = typeof appMeta.$inferSelect;

const SETTING_KEYS = Object.keys(SETTING_DEFAULTS);

export function settingsSnapshot(rows: readonly MetaRow[]): SettingsSnapshot {
    const raw = new Map(rows.map((row) => [row.key, row.value]));
    return {
        bool: (key) => parseBoolSetting(raw.get(key) ?? null, SETTING_DEFAULTS[key]),
        number: (key) => parseIntSetting(raw.get(key) ?? null, SETTING_DEFAULTS[key]),
    };
}

export function useBoolSetting(db: Database | null, key: BoolSettingKey): boolean {
    return useLiveValue(
        appMeta,
        () => selectSetting(db, key),
        (rows) => parseBoolSetting(rows[0]?.value ?? null, SETTING_DEFAULTS[key]),
        [db, key]
    );
}

export function useAiConsent(db: Database | null, key: AiConsentKey = "aiConsentV2"): AiConsent {
    return useLiveValue(
        appMeta,
        () => selectSetting(db, key),
        (rows) => parseAiConsent(rows[0]?.value ?? null),
        [db, key]
    );
}

const seedClockAtom = Atom.family((input: { db: Database; deviceUses24Hour: boolean | null }) =>
    Atom.make(
        input.deviceUses24Hour == null ? Effect.void : seedClockPreference(input.db, input.deviceUses24Hour)
    ).pipe(Atom.withLabel("settings:seed-clock"))
);

/** Mounted at the root, not on Time & Frames, which a user in a 24-hour locale has no reason to open. */
export function useSeededClockPreference(db: Database): void {
    // Null means the device reports no preference, which is not the same as 12-hour.
    const deviceUses24Hour = useCalendars()[0].uses24hourClock;
    useAtomMount(seedClockAtom({ db, deviceUses24Hour }));
}

export function useNumberSetting(db: Database | null, key: NumberSettingKey): number {
    return useLiveValue(
        appMeta,
        () => selectSetting(db, key),
        (rows) => parseIntSetting(rows[0]?.value ?? null, SETTING_DEFAULTS[key]),
        [db, key]
    );
}

function selectSetting(
    db: Database | null,
    key: BoolSettingKey | NumberSettingKey
): SyncQuery<{ value: string | null }> {
    if (db == null) {
        return { all: () => [] };
    }
    return db.select({ value: appMeta.value }).from(appMeta).where(eq(appMeta.key, key));
}

export function selectSettings(db: Database | null): SyncQuery<MetaRow> {
    if (db == null) {
        return { all: () => [] };
    }
    return db.select().from(appMeta).where(inArray(appMeta.key, SETTING_KEYS));
}
