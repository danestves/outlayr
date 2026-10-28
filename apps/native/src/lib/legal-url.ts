import { languageSubtag } from "@/i18n/languages";
import type { Language } from "@/i18n/languages";

export const PRIVACY_SECTIONS = {
    ai: { en: "suggestions-voice-and-receipts", es: "sugerencias-voz-y-recibos" },
    smartFill: { en: "merchant-suggestions-smart-fill", es: "sugerencias-de-comercios-autocompletado" },
} as const;

/** The site has no Portuguese pages, so pt opens the English one. */
export function legalUrl(
    page: "privacy" | "terms",
    language: Language,
    section?: keyof typeof PRIVACY_SECTIONS
): string {
    const siteLanguage = languageSubtag(language) === "es" ? "es" : "en";
    const path = siteLanguage === "es" ? `https://tryoutlayr.com/es/${page}` : `https://tryoutlayr.com/${page}`;
    return section ? `${path}#${PRIVACY_SECTIONS[section][siteLanguage]}` : path;
}
