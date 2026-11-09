import { useAtomMount } from "@effect/atom-react/Hooks";
import { inArray } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Atom from "effect/reactivity/Atom";
import { useCalendars } from "expo-localization";

import type { Database } from "@/db/client";
import { appMeta } from "@/db/schema";

import { useMetaText } from "./app-meta";
import { Meta } from "./app-meta-core";
import { SETTING_NAMES } from "./app-meta-registry";
import type { MetaValue, SettingName } from "./app-meta-registry";
import type { SyncQuery } from "./live-query";
import { aiConsentOf, seedClockPreference } from "./settings-core";
import type { AiConsent, AiConsentKey } from "./settings-core";

export interface SettingsSnapshot {
    get: <K extends SettingName>(key: K) => MetaValue<K>;
}

type MetaRow = typeof appMeta.$inferSelect;

export function settingsSnapshot(rows: readonly MetaRow[]): SettingsSnapshot {
    const raw = new Map(rows.map((row) => [row.key, row.value]));
    return { get: (key) => Meta.decode(key, raw.get(key) ?? null) };
}

export function useAiConsent(db: Database | null, key: AiConsentKey = "aiConsentV2"): AiConsent {
    return aiConsentOf(key, useMetaText(db, key));
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

export function selectSettings(db: Database | null): SyncQuery<MetaRow> {
    if (db == null) {
        return { all: () => [] };
    }
    return db.select().from(appMeta).where(inArray(appMeta.key, SETTING_NAMES));
}
