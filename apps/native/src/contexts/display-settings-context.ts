import { useAtomValue } from "@effect/atom-react/Hooks";
import { getTableName } from "drizzle-orm";
import * as Cause from "effect/Cause";
import * as Equal from "effect/Equal";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as Atom from "effect/reactivity/Atom";

import { subscribeToTableChanges } from "@/data/database-changes";
import { selectDisplaySettings } from "@/data/display-settings";
import type { DisplaySettings } from "@/data/display-settings";
import { sameRows } from "@/data/same-rows";
import { selectSettings, settingsSnapshot, useBoolSetting, useNumberSetting } from "@/data/settings";
import type { SettingsSnapshot } from "@/data/settings";
import type { BoolSettingKey, NumberSettingKey } from "@/data/settings-core";
import { appMeta } from "@/db/schema";
import { SILENT } from "@/state/atom-command";
import { setBoolSettingCommand, setNumberSettingCommand } from "@/state/settings-commands";
import { useAtomCommand } from "@/state/use-atom-command";

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
    }).pipe(Atom.withLabel("display-settings:rows")),
    sameRows
);

// Two atoms over one subscription: the display atom holds three booleans, so it stays stable across other setting
// writes, while `settingsAtom` republishes on every write.
const settingsAtom = Atom.make((get) => settingsSnapshot(get(settingRowsAtom))).pipe(
    Atom.withLabel("display-settings:snapshot")
);
const displaySettingsAtom = Atom.make((get) => selectDisplaySettings(get(settingsAtom))).pipe(
    Atom.withEquality(Equal.equals),
    Atom.withLabel("display-settings:display")
);

export function useDisplaySettings(): DisplaySettingsValue {
    return { state: useAtomValue(displaySettingsAtom) };
}

export function useAppSettings(): AppSettingsValue {
    const { db } = useLocalData();
    const state = useAtomValue(settingsAtom);
    const setBoolSetting = useAtomCommand(setBoolSettingCommand, SILENT);
    const setNumberSetting = useAtomCommand(setNumberSettingCommand, SILENT);
    return {
        actions: {
            setBool: (key, value) => {
                if (db == null) {
                    return;
                }
                setBoolSetting({ db, key, value }).then((result) => {
                    if (AsyncResult.isFailure(result)) {
                        console.error(`Saving the ${key} setting failed`, Cause.squash(result.cause));
                    }
                });
            },
            setNumber: (key, value) => {
                if (db == null) {
                    return;
                }
                setNumberSetting({ db, key, value }).then((result) => {
                    if (AsyncResult.isFailure(result)) {
                        console.error(`Saving the ${key} setting failed`, Cause.squash(result.cause));
                    }
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
