import { openSettings } from "expo-linking";

export function hasSystemLanguageSettings(): boolean {
    return true;
}

export function openLanguageSettings(): void {
    openSettings().catch(() => undefined);
}
