import { createContext, use, useMemo } from "react";
import type { ReactNode } from "react";

import { selectDisplaySettings } from "@/data/display-settings";
import type { DisplaySettings } from "@/data/display-settings";
import { useAllSettings, useBoolSetting, useNumberSetting } from "@/data/settings";
import type { SettingsSnapshot } from "@/data/settings";
import { setBoolSetting, setNumberSetting } from "@/data/settings-core";
import type { BoolSettingKey, NumberSettingKey } from "@/data/settings-core";

import { useLocalData } from "./local-data-context";

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

const OUTSIDE_PROVIDER = "useDisplaySettings and useAppSettings must be used within AppSettingsProvider";

const DisplaySettingsContext = createContext<DisplaySettingsValue | null>(null);
const AppSettingsContext = createContext<AppSettingsValue | null>(null);

// Two contexts over one subscription: the display memo is keyed on three booleans, so it stays stable across other
// setting writes, while `AppSettingsContext` republishes on every write.
export function AppSettingsProvider({ children }: { children: ReactNode }) {
    const { db } = useLocalData();
    const settings = useAllSettings(db);
    const { showCents, use24Hour, swapTimeLabel } = selectDisplaySettings(settings);

    const displayValue = useMemo<DisplaySettingsValue>(
        () => ({ state: { showCents, swapTimeLabel, use24Hour } }),
        [showCents, use24Hour, swapTimeLabel]
    );

    const appValue = useMemo<AppSettingsValue>(
        () => ({
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
            state: settings,
        }),
        [settings, db]
    );

    return (
        <AppSettingsContext.Provider value={appValue}>
            <DisplaySettingsContext.Provider value={displayValue}>{children}</DisplaySettingsContext.Provider>
        </AppSettingsContext.Provider>
    );
}

export function useDisplaySettings(): DisplaySettingsValue {
    const value = use(DisplaySettingsContext);
    if (value == null) {
        throw new Error(OUTSIDE_PROVIDER);
    }
    return value;
}

export function useAppSettings(): AppSettingsValue {
    const value = use(AppSettingsContext);
    if (value == null) {
        throw new Error(OUTSIDE_PROVIDER);
    }
    return value;
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
