import { getLocales } from "expo-localization";
import { useSyncExternalStore } from "react";

import { subscribeAppState } from "@/lib/app-state";

/** Display catalog only: currency stays a stated onboarding choice (§1.7), never derived from the locale. */
export function firstLocale() {
    try {
        return getLocales()[0] ?? null;
    } catch {
        return null;
    }
}

function deviceLanguageTag(): string | null {
    return firstLocale()?.languageTag ?? null;
}

/** Re-read on foreground for Android, which keeps the process across a language change; iOS restarts the app. */
export function useDeviceLanguageTag(): string | null {
    return useSyncExternalStore(subscribeAppState, deviceLanguageTag);
}
