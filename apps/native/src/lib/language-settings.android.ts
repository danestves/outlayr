import { applicationId } from "expo-application";
import { openSettings } from "expo-linking";
import { Platform } from "react-native";

import type {
    hasSystemLanguageSettings as iosHasSystemLanguageSettings,
    openLanguageSettings as iosOpenLanguageSettings,
} from "@/lib/language-settings";

/** Android 13 added per-app languages. Before it the system has nothing to pick, so the row is hidden. */
const PER_APP_LANGUAGE_API = 33;

export const hasSystemLanguageSettings: typeof iosHasSystemLanguageSettings = () =>
    Number(Platform.Version) >= PER_APP_LANGUAGE_API;

function openAppInfo(): void {
    openSettings().catch(() => undefined);
}

/**
 * The page only registers for an intent whose data names the package, which `Linking.sendIntent` can't set.
 * expo-intent-launcher is required lazily: it loads its native module on import, which older builds lack.
 */
async function openAppLanguagePage(): Promise<void> {
    if (applicationId === null) {
        throw new Error("No application id to open the language page for");
    }
    // SAFETY: untyped `require`, asserted to that module's own type.
    const { ActivityAction, startActivityAsync } =
        require("expo-intent-launcher") as typeof import("expo-intent-launcher");
    await startActivityAsync(ActivityAction.APP_LOCALE_SETTINGS, { data: `package:${applicationId}` });
}

/** A system without the page, or a build without the module, gets App info, which lists Language on Android 13+. */
export const openLanguageSettings: typeof iosOpenLanguageSettings = () => {
    openAppLanguagePage().catch(openAppInfo);
};
