const LANGUAGE_TAG = /^[a-z]{2,3}(?:-[a-z0-9]{1,8})*$/iu;

interface Preference {
    language: string;
    tag: string;
    order: number;
    quality: number;
}

const preferenceOf = (part: string, order: number): Preference | null => {
    const [tagPart = "", ...params] = part.split(";");
    const quality = params.find((param) => param.trim().startsWith("q="));
    const parsed = quality === undefined ? 1 : Number.parseFloat(quality.trim().slice(2));
    const tag = tagPart.trim().toLowerCase();
    if (!LANGUAGE_TAG.test(tag) || !Number.isFinite(parsed) || parsed <= 0) {
        return null;
    }
    const [language = ""] = tag.split("-");
    return { language, tag, order, quality: parsed };
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
    for (const { language, tag } of preferences) {
        const exact = declared.find((locale) => locale.toLowerCase() === tag);
        if (exact !== undefined) {
            return exact;
        }
        const generic = declared.find((locale) => locale.toLowerCase() === language);
        if (generic !== undefined) {
            return generic;
        }
    }
    return null;
}
