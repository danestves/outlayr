export const LANGUAGES = ["en", "es", "fr", "pt"] as const;

export type Language = (typeof LANGUAGES)[number];

export const formatDate = (ms: number, language: Language, timeZone = "UTC") =>
    new Intl.DateTimeFormat(language === "en" ? "en-GB" : language, { dateStyle: "long", timeZone }).format(ms);
