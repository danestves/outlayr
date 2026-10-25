import type { Language } from "@/i18n/languages";

/** The site has no Portuguese pages, so pt opens the English one. */
export function legalUrl(page: "privacy" | "terms", language: Language): string {
    return language === "es" ? `https://tryoutlayr.com/es/${page}` : `https://tryoutlayr.com/${page}`;
}
