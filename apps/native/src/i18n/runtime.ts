import { CATALOGS, EN } from "./catalog";
import type { TranslatableKey } from "./catalog";
import { DEFAULT_LANGUAGE } from "./languages";
import type { Language } from "./languages";
import { translate } from "./translate";
import type { TranslationParams } from "./translate";

let current: Language = DEFAULT_LANGUAGE;

export function setRuntimeLanguage(language: Language): void {
    current = language;
}

export function runtimeLanguage(): Language {
    return current;
}

/**
 * For code hooks cannot reach: the root error boundary, which renders in place of the provider tree, and background
 * work. It does not re-render on a language change; components use `useTranslation`.
 */
export function translateNow(key: TranslatableKey, params?: TranslationParams): string {
    return translate(key, {
        catalog: CATALOGS[current] ?? EN,
        fallback: EN,
        params,
    });
}
