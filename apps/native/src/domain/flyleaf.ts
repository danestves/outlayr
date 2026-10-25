import type { Language } from "@/i18n/languages";

import { monthLongTitle } from "./dates";

/** Hand-rolled, not `toLocaleDateString`: Hermes ships without ICU, so every language would read as en-US. */
export function flyleafDate(date: Date, language: Language): string {
    const day = date.getDate();
    const month = monthLongTitle(date, language);
    const year = date.getFullYear();
    return language === "en" ? `${month} ${day}, ${year}` : `${day} de ${month} de ${year}`;
}
