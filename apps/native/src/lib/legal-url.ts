import type { Language } from "@/i18n/languages";

const SITE_LANGUAGE = {
    en: "en",
    es: "es",
    "es-ES": "es",
    fr: "fr",
    pt: "pt",
    "pt-PT": "pt",
} as const satisfies Record<Language, string>;

export const PRIVACY_SECTIONS = {
    ai: {
        en: "suggestions-voice-and-receipts",
        es: "sugerencias-voz-y-recibos",
        fr: "suggestions-voix-et-tickets",
        pt: "sugestões-voz-e-recibos",
    },
    smartFill: {
        en: "merchant-suggestions-smart-fill",
        es: "sugerencias-de-comercios-autocompletado",
        fr: "suggestions-de-commerçants-remplissage-intelligent",
        pt: "sugestões-de-estabelecimentos-preenchimento-inteligente",
    },
} as const satisfies Record<string, Record<(typeof SITE_LANGUAGE)[Language], string>>;

export function legalUrl(
    page: "privacy" | "terms",
    language: Language,
    section?: keyof typeof PRIVACY_SECTIONS
): string {
    const siteLanguage = SITE_LANGUAGE[language];
    const path =
        siteLanguage === "en" ? `https://tryoutlayr.com/${page}` : `https://tryoutlayr.com/${siteLanguage}/${page}`;
    return section ? `${path}#${PRIVACY_SECTIONS[section][siteLanguage]}` : path;
}
