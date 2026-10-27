import * as Effect from "effect/Effect";
import { openSettings } from "expo-linking";

export function hasSystemLanguageSettings(): boolean {
    return true;
}

export const openLanguageSettings = () => Effect.ignore(Effect.tryPromise(() => openSettings()));
