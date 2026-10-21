import type { ReactNode } from "react";
import { createContext, use, useCallback, useMemo } from "react";

import { CATALOGS, EN } from "./catalog";
import type { TranslatableKey } from "./catalog";
import { useDeviceLanguageTag } from "./device-language";
import { resolveLanguage } from "./languages";
import type { Language } from "./languages";
import { setRuntimeLanguage } from "./runtime";
import { translate } from "./translate";
import type { TranslationParams } from "./translate";

export type TranslateFn = (key: TranslatableKey, params?: TranslationParams) => string;

interface LanguageContextValue {
    language: Language;
    t: TranslateFn;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

/** The language is the device's: iOS owns it per app (Settings › Outlayr › Language), so nothing is stored here. */

export function LanguageProvider({ children }: { children: ReactNode }) {
    const language = resolveLanguage(useDeviceLanguageTag());
    // During render, not in an effect: `runtimeLanguage()` defaults the date, budget and insights formatters,
    // so an effect would hand children the previous language for a frame.
    setRuntimeLanguage(language);

    const t = useCallback<TranslateFn>(
        (key, params) =>
            translate(key, {
                catalog: CATALOGS[language] ?? EN,
                fallback: EN,
                params,
            }),
        [language]
    );

    const value = useMemo(() => ({ language, t }), [language, t]);

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

function useLanguageContext(): LanguageContextValue {
    const context = use(LanguageContext);
    if (!context) {
        throw new Error("useTranslation must be used within LanguageProvider");
    }
    return context;
}

export function useTranslation(): TranslateFn {
    return useLanguageContext().t;
}

export function useLanguage() {
    const { language } = useLanguageContext();
    return { language };
}
