export const SUPPORTED_LANGUAGES = ["en", "es"] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = "en";

/** Endonyms: someone stuck in a language they cannot read must still recognise their own. */
const LANGUAGE_NAMES = {
    en: "English",
    es: "Español",
} satisfies Record<Language, string>;

export function languageLabel(language: Language): string {
    return LANGUAGE_NAMES[language];
}

function isLanguage(value: string): value is Language {
    // SAFETY: widening the tuple so an arbitrary string can be tested; narrowing the argument is the point.
    return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

const TAG_SUBTAG_SEPARATOR = /[-_]/;

export function languageFromTag(tag: string | null | undefined): Language | null {
    if (!tag) {
        return null;
    }
    const primary = tag.split(TAG_SUBTAG_SEPARATOR)[0]?.toLowerCase();
    return primary && isLanguage(primary) ? primary : null;
}

export function resolveLanguage(deviceTag: string | null | undefined): Language {
    return languageFromTag(deviceTag) ?? DEFAULT_LANGUAGE;
}
