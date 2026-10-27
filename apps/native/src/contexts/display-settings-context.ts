import { useAtomValue } from "@effect/atom-react/Hooks";
import { getTableName } from "drizzle-orm";
import * as Equal from "effect/Equal";
import * as Atom from "effect/reactivity/Atom";

import { subscribeToTableChanges } from "@/data/database-changes";
import { selectDisplaySettings } from "@/data/display-settings";
import type { DisplaySettings } from "@/data/display-settings";
import { sameRows } from "@/data/same-rows";
import { selectSettings, settingsSnapshot, useBoolSetting, useNumberSetting } from "@/data/settings";
import type { SettingsSnapshot } from "@/data/settings";
import { setBoolSetting, setNumberSetting } from "@/data/settings-core";
import type { BoolSettingKey, NumberSettingKey } from "@/data/settings-core";
import { appMeta } from "@/db/schema";

import { localDataAtom, localDataState, useLocalData } from "./local-data-context";

export interface DisplaySettingsValue {
    state: DisplaySettings;
}

export interface AppSettingsValue {
    actions: {
        setBool: (key: BoolSettingKey, value: boolean) => void;
        setNumber: (key: NumberSettingKey, value: number) => void;
    };
    state: SettingsSnapshot;
}

const settingRowsAtom = Atom.withEquality(
    Atom.make((get) => {
        const { db } = localDataState(get(localDataAtom));
        get.addFinalizer(
            subscribeToTableChanges(getTableName(appMeta), () => {
                get.refreshSelf();
            })
        );
        return selectSettings(db).all();
    }),
    sameRows
);

// Two atoms over one subscription: the display atom holds three booleans, so it stays stable across other setting
// writes, while `settingsAtom` republishes on every write.
const settingsAtom = Atom.make((get) => settingsSnapshot(get(settingRowsAtom)));
const displaySettingsAtom = Atom.make((get) => selectDisplaySettings(get(settingsAtom))).pipe(
    Atom.withEquality(Equal.equals)
);

export function useDisplaySettings(): DisplaySettingsValue {
    return { state: useAtomValue(displaySettingsAtom) };
}

export function useAppSettings(): AppSettingsValue {
    const { db } = useLocalData();
    const state = useAtomValue(settingsAtom);
    return {
        actions: {
            setBool: (key, value) => {
                if (db == null) {
                    return;
                }
                setBoolSetting(db, key, value).catch((cause: unknown) => {
                    console.error(`Saving the ${key} setting failed`, cause);
                });
            },
            setNumber: (key, value) => {
                if (db == null) {
                    return;
                }
                setNumberSetting(db, key, value).catch((cause: unknown) => {
                    console.error(`Saving the ${key} setting failed`, cause);
                });
            },
        },
        state,
    };
}

// Prefer these to `useAppSettings` for one key: that republishes on every setting write and re-renders the caller
// for every unrelated toggle.
export function useSettingBool(key: BoolSettingKey): boolean {
    const { db } = useLocalData();
    return useBoolSetting(db, key);
}

export function useSettingNumber(key: NumberSettingKey): number {
    const { db } = useLocalData();
    return useNumberSetting(db, key);
}
