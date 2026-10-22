import { eq, inArray } from "drizzle-orm";
import { useCalendars } from "expo-localization";
import { useEffect, useMemo } from "react";

import type { Database } from "@/db/client";
import { appMeta } from "@/db/schema";

import { useLiveQuery, useLiveValue } from "./live-query";
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

/**
 * One subscription, but a context still re-renders every consumer on any toggle, so prefer
 * `useBoolSetting`/`useNumberSetting` wherever the render costs more than their keyed lookup.
 */
export function useAllSettings(db: Database | null): SettingsSnapshot {
    // Nullable: `AppSettingsProvider` renders above the splash gate while the database opens; no consumer sees it.
    const rows = useLiveQuery(appMeta, () => selectSettings(db), [db]);
    return useMemo(() => settingsSnapshot(rows), [rows]);
}

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

/** Mounted at the root, not on Time & Frames, which a user in a 24-hour locale has no reason to open. */
export function useSeededClockPreference(db: Database): void {
    // Null means the device reports no preference, which is not the same as 12-hour.
    const deviceUses24Hour = useCalendars()[0].uses24hourClock;

    useEffect(() => {
        if (deviceUses24Hour == null) {
            return;
        }
        seedClockPreference(db, deviceUses24Hour);
    }, [db, deviceUses24Hour]);
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
