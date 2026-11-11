import * as Schema from "effect/Schema";

const SHUFFLED = [
    "search",
    "ai_assistant",
    "app_store",
    "x",
    "instagram",
    "tiktok",
    "linkedin",
    "reddit_hn",
    "friend",
] as const;

export const HeardFromSource = Schema.Literals([...SHUFFLED, "other"]);
export type HeardFromSource = typeof HeardFromSource.Type;

export const HEARD_FROM_DETAIL_MAX = 80;

export function heardFromOrder(random: () => number = Math.random): HeardFromSource[] {
    const shuffled = SHUFFLED.map((source) => ({ key: random(), source }))
        .sort((left, right) => left.key - right.key)
        .map(({ source }): HeardFromSource => source);
    return [...shuffled, "other"];
}

export function heardFromProperties(source: HeardFromSource, detail: string) {
    const properties = { $set: { heard_from: source }, source };
    const trimmed = detail.trim().slice(0, HEARD_FROM_DETAIL_MAX).trim();
    return source === "other" && trimmed !== "" ? { ...properties, detail: trimmed } : properties;
}
