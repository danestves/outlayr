const LANGUAGE_TAG = /^[a-z]{2,3}$/iu;

interface Preference {
    language: string;
    order: number;
    quality: number;
}

const preferenceOf = (part: string, order: number): Preference | null => {
    const [tag = "", ...params] = part.split(";");
    const quality = params.find((param) => param.trim().startsWith("q="));
    const parsed = quality === undefined ? 1 : Number.parseFloat(quality.trim().slice(2));
    const language = tag.trim().toLowerCase().split("-")[0] ?? "";
    if (!LANGUAGE_TAG.test(language) || !Number.isFinite(parsed) || parsed <= 0) {
        return null;
    }
    return { language, order, quality: parsed };
};

export function matchAcceptLanguage<Locale extends string>(
    header: string | undefined,
    declared: readonly Locale[]
): Locale | null {
    if (!header) {
        return null;
    }
    const preferences = header
        .split(",")
        .map((part, order) => preferenceOf(part, order))
        .filter((preference): preference is Preference => preference !== null)
        .toSorted((left, right) => right.quality - left.quality || left.order - right.order);
    for (const { language } of preferences) {
        const match = declared.find((locale) => locale.toLowerCase() === language);
        if (match !== undefined) {
            return match;
        }
    }
    return null;
}
